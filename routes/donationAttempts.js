const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../config/database');
const Notification = require('../models/Notification');
const Donation = require('../models/Donation');
const { canDonateToRecipient } = require('../utils/bloodTypeCompatibility');
// ADD THIS
const { updateDonationCount } = require('../services/gamificationService');
// END ADD THIS

const router = express.Router();

// Create a new donation attempt (when donor submits)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { request_id, donor_id, donor_name, donor_phone, donor_email, questionnaire_passed } = req.body;

    // Validate required fields
    if (!request_id || !donor_id || !donor_name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // ── Guard 1: Cooldown / Availability check ──────────────────────
    const [donorRows] = await db.execute(
      'SELECT blood_type, is_available_donor, cooldown_ends_at FROM users WHERE id = ?',
      [donor_id]
    );

    if (donorRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    const donor = donorRows[0];

    if (!donor.is_available_donor) {
      const cooldownEnd = donor.cooldown_ends_at ? new Date(donor.cooldown_ends_at) : null;
      const now = new Date();
      if (cooldownEnd && cooldownEnd > now) {
        const daysLeft = Math.ceil((cooldownEnd - now) / (1000 * 60 * 60 * 24));
        return res.status(403).json({
          success: false,
          message: `You are on a donation cooldown. You can donate again in ${daysLeft} day(s) (${cooldownEnd.toLocaleDateString()}).`
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Your donor availability is currently turned off. Please enable it in your profile before donating.'
      });
    }

    // ── Guard 2: Blood type compatibility check ─────────────────────
    const [requestRows] = await db.execute(
      'SELECT blood_type FROM blood_requests WHERE id = ?',
      [request_id]
    );

    if (requestRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Blood request not found' });
    }

    const recipientBloodType = requestRows[0].blood_type;
    const donorBloodType = donor.blood_type;

    if (!donorBloodType) {
      return res.status(400).json({
        success: false,
        message: 'Your blood type is not set. Please update your profile before donating.'
      });
    }

    if (!canDonateToRecipient(donorBloodType, recipientBloodType)) {
      return res.status(403).json({
        success: false,
        message: `Your blood type (${donorBloodType}) is not compatible with this request (${recipientBloodType}). You cannot donate to this request.`
      });
    }

    // Check if donation attempt already exists for this donor on this request
    const [existing] = await db.execute(
      'SELECT id FROM donation_attempts WHERE request_id = ? AND donor_id = ?',
      [request_id, donor_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'You have already submitted a donation offer for this request',
        attempt_id: existing[0].id
      });
    }

    // Insert new donation attempt
    const [result] = await db.execute(
      `INSERT INTO donation_attempts 
       (request_id, donor_id, donor_name, donor_phone, donor_email, questionnaire_passed, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [request_id, donor_id, donor_name, donor_phone, donor_email, questionnaire_passed ? 1 : 0]
    );

    // Fetch blood request to get requester ID and blood type
    const [bloodReq] = await db.execute(
      'SELECT user_id, blood_type FROM blood_requests WHERE id = ?',
      [request_id]
    );

    if (bloodReq.length > 0) {
      const requesterId = bloodReq[0].user_id;
      const bloodType = bloodReq[0].blood_type;

      // Create notification for requester
      await Notification.create({
        user_id: requesterId,
        type: 'donation_offer',
        title: 'New Donation Offer',
        message: `${donor_name} has offered to donate ${bloodType} blood for your request.`,
        blood_request_id: request_id,
        related_user_id: donor_id
      });

      console.log(`[NOTIFICATION] Donation offer sent to requester ${requesterId}`);
    }

    res.json({
      success: true,
      message: 'Donation attempt submitted successfully',
      attempt: {
        id: result.insertId,
        request_id,
        donor_id,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating donation attempt:', error);
    res.status(500).json({ success: false, message: 'Error creating donation attempt' });
  }
});

// Get all donation attempts for current user (as donor)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    console.log('[DEBUG] req.user:', req.user);
    console.log('[DEBUG] req.user.id:', req.user?.id);
    
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID not found in token' });
    }

    const [attempts] = await db.execute(
      `SELECT id, request_id, donor_id, donor_name, status, created_at, updated_at 
       FROM donation_attempts 
       WHERE donor_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      attempts: attempts || []
    });
  } catch (error) {
    console.error('Error fetching donation attempts:', error);
    res.status(500).json({ success: false, message: 'Error fetching donation attempts' });
  }
});

// Get all donors for a specific blood request (requester view)
router.get('/request/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;
    
    console.log('\n[DONATION_ATTEMPTS] GET /request/:requestId');
    console.log('  requestId:', requestId, 'type:', typeof requestId);
    console.log('  userId:', userId, 'type:', typeof userId);
    
    if (!userId) {
      console.error('  ERROR: No user ID found in token');
      return res.status(401).json({ success: false, message: 'User ID not found in token' });
    }

    // Verify requester owns this request
    const [request] = await db.execute(
      'SELECT id, user_id FROM blood_requests WHERE id = ?',
      [requestId]
    );

    console.log('  Query result:', { found: request.length > 0, length: request.length });
    
    if (request.length === 0) {
      console.error('  ERROR: Blood request not found with id:', requestId);
      return res.status(404).json({ success: false, message: 'Blood request not found' });
    }

    const ownerUserId = request[0].user_id;
    console.log('  Owner userId:', ownerUserId, 'type:', typeof ownerUserId);
    console.log('  Match:', ownerUserId === userId, '(strict) OR', ownerUserId == userId, '(loose)');

    if (Number(ownerUserId) !== Number(userId)) {
      console.warn(`  AUTH FAILED: owner ${ownerUserId} !== user ${userId}`);
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    console.log('  ✓ Authorization passed');

    // Get all donation attempts for this request
    const [attempts] = await db.execute(
      `SELECT id, donor_id, donor_name, donor_phone, donor_email, status, blood_units, blood_type_donated, created_at 
       FROM donation_attempts 
       WHERE request_id = ? 
       ORDER BY created_at DESC`,
      [requestId]
    );

    res.json({
      success: true,
      attempts: attempts || []
    });
  } catch (error) {
    console.error('Error fetching donation attempts:', error);
    res.status(500).json({ success: false, message: 'Error fetching donation attempts' });
  }
});

// Update a donation attempt (edit contact info)
router.put('/:attemptId', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { donor_name, donor_phone, donor_email } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID not found in token' });
    }

    // Verify this is the donor's attempt
    const [attempt] = await db.execute(
      'SELECT donor_id FROM donation_attempts WHERE id = ?',
      [attemptId]
    );

    if (attempt.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation attempt not found' });
    }

    if (attempt[0].donor_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Update the attempt
    await db.execute(
      `UPDATE donation_attempts 
       SET donor_name = ?, donor_phone = ?, donor_email = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [donor_name, donor_phone, donor_email, attemptId]
    );

    res.json({
      success: true,
      message: 'Donation attempt updated successfully',
      attempt: {
        id: attemptId,
        donor_name,
        donor_phone,
        donor_email,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating donation attempt:', error);
    res.status(500).json({ success: false, message: 'Error updating donation attempt' });
  }
});

// Accept a donor (requester marks donor as accepted)
router.post('/:attemptId/accepted', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID not found in token' });
    }

    // Get the attempt and verify requester owns the request
    const [attempt] = await db.execute(
      `SELECT da.id, da.request_id, br.user_id 
       FROM donation_attempts da 
       JOIN blood_requests br ON da.request_id = br.id 
       WHERE da.id = ?`,
      [attemptId]
    );

    if (attempt.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation attempt not found' });
    }

    if (attempt[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Update status to accepted
    await db.execute(
      'UPDATE donation_attempts SET status = "accepted", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [attemptId]
    );

    // Also update the blood request status to ongoing
    await db.execute(
      'UPDATE blood_requests SET status = "ongoing", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [attempt[0].request_id]
    );

    // Fetch the accepted donor and requester details for notifications
    const [acceptedAttempt] = await db.execute(
      `SELECT da.donor_id, da.donor_name, da.request_id, br.user_id as requester_id
       FROM donation_attempts da 
       JOIN blood_requests br ON da.request_id = br.id 
       WHERE da.id = ?`,
      [attemptId]
    );

    if (acceptedAttempt.length > 0) {
      const donorId = acceptedAttempt[0].donor_id;
      const donorName = acceptedAttempt[0].donor_name;
      const requesterId = acceptedAttempt[0].requester_id;
      const requestId = acceptedAttempt[0].request_id;

      // Fetch requester name for donor notification
      const [requester] = await db.execute(
        'SELECT fullname FROM users WHERE id = ?',
        [requesterId]
      );
      const requesterName = requester.length > 0 ? requester[0].fullname : 'A user';

      // Notify the accepted donor
      console.log(`[NOTIFICATION] Creating acceptance notification for donor ${donorId}`);
      await Notification.create({
        user_id: donorId,
        type: 'donation_accepted',
        title: 'Donation Accepted!',
        message: `Your donation offer has been accepted by ${requesterName}. Please check for further instructions.`,
        blood_request_id: requestId,
        related_user_id: requesterId
      });
      console.log(`[NOTIFICATION] ✓ Acceptance notification created for donor ${donorId}`);

      console.log(`[NOTIFICATION] Donor acceptance sent to ${donorId}`);

      // Fetch and notify all declined donors
      const [declinedDonors] = await db.execute(
        `SELECT donor_id FROM donation_attempts WHERE request_id = ? AND status = "declined" AND donor_id != ?`,
        [acceptedAttempt[0].request_id, donorId]
      );

      for (const declined of declinedDonors) {
        await Notification.create({
          user_id: declined.donor_id,
          type: 'donation_declined',
          title: 'Donation Declined',
          message: `Another donor was selected for this blood request. Thank you for your offer!`,
          blood_request_id: acceptedAttempt[0].request_id,
          related_user_id: requesterId
        });
      }

      if (declinedDonors.length > 0) {
        console.log(`[NOTIFICATION] Decline notifications sent to ${declinedDonors.length} donors`);
      }
    }

    // Optionally: Decline all other donations for this request
    await db.execute(
      'UPDATE donation_attempts SET status = "declined", updated_at = CURRENT_TIMESTAMP WHERE request_id = ? AND id != ? AND status = "pending"',
      [attempt[0].request_id, attemptId]
    );

    res.json({
      success: true,
      message: 'Donor accepted successfully',
      attempt: {
        id: attempt[0].id,
        status: 'accepted'
      }
    });
  } catch (error) {
    console.error('Error accepting donor:', error);
    res.status(500).json({ success: false, message: 'Error accepting donor' });
  }
});

// Decline a donor (requester marks donor as declined)
router.post('/:attemptId/declined', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID not found in token' });
    }

    // Get the attempt and verify requester owns the request
    const [attempt] = await db.execute(
      `SELECT da.id, br.user_id 
       FROM donation_attempts da 
       JOIN blood_requests br ON da.request_id = br.id 
       WHERE da.id = ?`,
      [attemptId]
    );

    if (attempt.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation attempt not found' });
    }

    if (attempt[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Update status to declined
    await db.execute(
      'UPDATE donation_attempts SET status = "declined", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [attemptId]
    );

    // Fetch donor info to send notification
    const [declinedAttempt] = await db.execute(
      `SELECT da.donor_id, da.request_id, br.user_id as requester_id
       FROM donation_attempts da 
       JOIN blood_requests br ON da.request_id = br.id 
       WHERE da.id = ?`,
      [attemptId]
    );

    if (declinedAttempt.length > 0) {
      const donorId = declinedAttempt[0].donor_id;
      const requesterId = declinedAttempt[0].requester_id;

      // Notify the declined donor
      await Notification.create({
        user_id: donorId,
        type: 'donation_declined',
        title: 'Donation Declined',
        message: `Your donation offer has been declined. Thank you for your willingness to help!`,
        blood_request_id: declinedAttempt[0].request_id,
        related_user_id: requesterId
      });

      console.log(`[NOTIFICATION] Decline notification sent to donor ${donorId}`);
    }

    res.json({
      success: true,
      message: 'Donor declined successfully'
    });
  } catch (error) {
    console.error('Error declining donor:', error);
    res.status(500).json({ success: false, message: 'Error declining donor' });
  }
});

// Complete donation (donor submits how much they donated)
router.post('/:attemptId/complete', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { blood_units, blood_type } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID not found in token' });
    }

    if (!blood_units || !blood_type) {
      return res.status(400).json({ success: false, message: 'Missing blood_units or blood_type' });
    }

    // Verify this is the donor's attempt and it's accepted
    const [attempt] = await db.execute(
      `SELECT da.donor_id, da.request_id, da.status, br.user_id as requester_id
       FROM donation_attempts da 
       JOIN blood_requests br ON da.request_id = br.id 
       WHERE da.id = ?`,
      [attemptId]
    );

    if (attempt.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation attempt not found' });
    }

    if (Number(attempt[0].donor_id) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (attempt[0].status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Can only complete accepted donations' });
    }

    // Update donation_attempts with blood units and type donated
    console.log(`[DONATION COMPLETE] Updating attempt ${attemptId}: units=${blood_units}, type=${blood_type}`);
    await db.execute(
      `UPDATE donation_attempts 
       SET blood_units = ?, blood_type_donated = ? 
       WHERE id = ?`,
      [blood_units, blood_type, attemptId]
    );
    console.log('[DONATION COMPLETE] Updated successfully');

    // Notify requester that donation is ready for review
    const [requester] = await db.execute(
      'SELECT fullname FROM users WHERE id = ?',
      [attempt[0].requester_id]
    );

    await Notification.create({
      user_id: attempt[0].requester_id,
      type: 'donation_ready_review',
      title: 'Donation Ready for Review',
      message: `Your accepted donor has submitted ${blood_units} units of ${blood_type} blood. Please review and confirm.`,
      blood_request_id: attempt[0].request_id,
      related_user_id: userId
    });

    console.log(`[DONATION] Completed donation submitted by user ${userId}, awaiting review`);

    res.json({
      success: true,
      message: 'Donation submitted for review',
      donation_id: attemptId
    });
  } catch (error) {
    console.error('Error completing donation:', error);
    res.status(500).json({ success: false, message: 'Error completing donation' });
  }
});

// Confirm completed donation (requester confirms the donation)
router.post('/:attemptId/confirm-complete', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID not found in token' });
    }

    // Verify requester owns this request
    const [attempt] = await db.execute(
      `SELECT da.id, da.donor_id, da.request_id, da.blood_units, da.blood_type_donated, br.user_id as requester_id
       FROM donation_attempts da 
       JOIN blood_requests br ON da.request_id = br.id 
       WHERE da.id = ?`,
      [attemptId]
    );

    if (attempt.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation attempt not found' });
    }

    if (Number(attempt[0].requester_id) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Update blood request to completed
    await db.execute(
      'UPDATE blood_requests SET status = "completed", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [attempt[0].request_id]
    );

    // Mark the donation attempt as confirmed so the UI knows it's done
    await db.execute(
      'UPDATE donation_attempts SET status = "confirmed", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [attemptId]
    );

    // Create donation record
    const [donationResult] = await db.execute(
      `INSERT INTO donations (user_id, donation_date, blood_type, blood_units, status)
       VALUES (?, NOW(), ?, ?, 'completed')`,
      [attempt[0].donor_id, attempt[0].blood_type_donated, attempt[0].blood_units]
    );

    // Notify donor that donation was confirmed
    await Notification.create({
      user_id: attempt[0].donor_id,
      type: 'donation_confirmed',
      title: 'Donation Confirmed!',
      message: `Your donation of ${attempt[0].blood_units} units (${attempt[0].blood_type_donated}) has been confirmed and recorded. Thank you for saving lives!`,
      blood_request_id: attempt[0].request_id,
      related_user_id: userId
    });

    console.log(`[DONATION] Donation confirmed by requester ${userId} for donor ${attempt[0].donor_id}`);

    // ADD THIS — cooldown + gamification (same transaction)
    let newBadges = [];
    try {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Apply 56-day cooldown and increment lives_impacted
        await conn.execute(
          `UPDATE users
           SET is_available_donor = 0,
               cooldown_ends_at   = DATE_ADD(NOW(), INTERVAL 56 DAY),
               lives_impacted     = COALESCE(lives_impacted, 0) + 1
           WHERE id = ?`,
          [attempt[0].donor_id]
        );

        // 2. Recount donations, update tier + award badges
        const gamResult = await updateDonationCount(attempt[0].donor_id, conn);
        newBadges = gamResult.newlyAwardedBadges;

        await conn.commit();
        console.log(`[GAMIFICATION] Donor ${attempt[0].donor_id} → tier=${gamResult.newTier}, count=${gamResult.newCount}, cooldown set, newBadges=${newBadges}`);
      } catch (txErr) {
        await conn.rollback();
        console.error('[GAMIFICATION] Transaction error (non-fatal):', txErr.message);
      } finally {
        conn.release();
      }
    } catch (gamErr) {
      console.error('[GAMIFICATION] updateDonationCount failed (non-fatal):', gamErr.message);
    }
    // END ADD THIS

    res.json({
      success: true,
      message: 'Donation confirmed successfully',
      donor_updated: true,
      newBadges,  // array of badge IDs awarded — frontend can show toast
    });
  } catch (error) {
    console.error('Error confirming donation:', error);
    res.status(500).json({ success: false, message: 'Error confirming donation' });
  }
});

module.exports = router;
