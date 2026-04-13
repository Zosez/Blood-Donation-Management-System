function getCompatibleDonorTypes(recipientBloodType) {
    const compatibilityMap = {
        'O-': ['O-'],
        'O+': ['O-', 'O+'],
        'A-': ['O-', 'A-'],
        'A+': ['O-', 'O+', 'A-', 'A+'],
        'B-': ['O-', 'B-'],
        'B+': ['O-', 'O+', 'B-', 'B+'],
        'AB-': ['O-', 'A-', 'B-', 'AB-'],
        'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
    };
    
    return compatibilityMap[recipientBloodType] || [];
}

function canDonateToRecipient(donorBloodType, recipientBloodType) {
    const compatibleTypes = getCompatibleDonorTypes(recipientBloodType);
    return compatibleTypes.includes(donorBloodType);
}

module.exports = {
    getCompatibleDonorTypes,
    canDonateToRecipient
};
