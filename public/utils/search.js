const API_URL = '/api';

class ModernSearch {
  constructor(inputSelector, containerSelector) {
    this.input = document.querySelector(inputSelector);
    this.container = document.querySelector(containerSelector);
    this.debounceTimer = null;
    this.debounceDelay = 300;
    
    if (!this.input || !this.container) return;
    
    this.setupUI();
    this.attachListeners();
  }

  setupUI() {
    this.input.style.cssText = `
      width: 100%;
      padding: 12px 16px 12px 40px;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      font-size: 14px;
      transition: all 0.2s ease;
      background: white;
      position: relative;
      padding-left: 40px;
    `;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    `;
    
    this.input.parentNode.insertBefore(wrapper, this.input);
    wrapper.appendChild(this.input);

    const searchIcon = document.createElement('span');
    searchIcon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    `;
    searchIcon.style.cssText = `
      position: absolute;
      left: 12px;
      color: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    `;
    wrapper.insertBefore(searchIcon, this.input);

    this.clearBtn = document.createElement('button');
    this.clearBtn.innerHTML = '✕';
    this.clearBtn.type = 'button';
    this.clearBtn.style.cssText = `
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      opacity: 0;
      transition: opacity 0.2s;
    `;
    this.clearBtn.addEventListener('click', () => {
      this.input.value = '';
      this.input.focus();
      this.clearBtn.style.opacity = '0';
      this.hideResults();
    });
    wrapper.appendChild(this.clearBtn);

    this.resultsPanel = document.createElement('div');
    this.resultsPanel.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 12px 12px;
      max-height: 400px;
      overflow-y: auto;
      display: none;
      z-index: 1000;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    `;
    wrapper.parentNode.insertBefore(this.resultsPanel, wrapper.nextSibling);

    this.input.addEventListener('focus', () => {
      this.input.style.borderColor = '#c82020';
      this.input.style.boxShadow = '0 0 0 3px rgba(200,32,32,0.1)';
    });

    this.input.addEventListener('blur', () => {
      setTimeout(() => {
        this.input.style.borderColor = '#e5e7eb';
        this.input.style.boxShadow = 'none';
      }, 100);
    });
  }

  attachListeners() {
    this.input.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      
      if (value) {
        this.clearBtn.style.opacity = '1';
      } else {
        this.clearBtn.style.opacity = '0';
        this.hideResults();
        return;
      }

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.performSearch(value);
      }, this.debounceDelay);
    });

    this.input.addEventListener('keydown', (e) => {
      const items = this.resultsPanel.querySelectorAll('[data-result]');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const first = items[0];
        if (first) first.focus();
      } else if (e.key === 'Escape') {
        this.hideResults();
        this.input.blur();
      }
    });
  }

  async performSearch(query) {
    this.showLoading();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/blood-requests?search=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.displayResults(data.requests || []);
      } else {
        this.displayResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      this.displayResults([]);
    }
  }

  displayResults(results) {
    this.resultsPanel.innerHTML = '';

    if (results.length === 0) {
      const msg = document.createElement('div');
      msg.style.cssText = `
        padding: 16px;
        color: #9ca3af;
        text-align: center;
        font-size: 14px;
      `;
      msg.textContent = 'No results found';
      this.resultsPanel.appendChild(msg);
      this.showResults();
      return;
    }

    results.slice(0, 8).forEach((result, idx) => {
      const item = document.createElement('div');
      item.setAttribute('data-result', idx);
      item.style.cssText = `
        padding: 12px 16px;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        transition: background 0.15s;
      `;
      item.innerHTML = `
        <div style="font-weight: 500; font-size: 13px; color: #111827;">${this.escapeHtml(result.blood_type)} Blood Request</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${this.escapeHtml(result.hospital_name)}</div>
      `;
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f9fafb';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });
      item.addEventListener('click', () => {
        window.location.href = `/bloodRequest?id=${result.id}`;
      });
      this.resultsPanel.appendChild(item);
    });

    this.showResults();
  }

  showLoading() {
    this.resultsPanel.innerHTML = `
      <div style="padding: 16px; text-align: center;">
        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top-color: #c82020; border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    `;
    this.showResults();
  }

  showResults() {
    this.resultsPanel.style.display = 'block';
  }

  hideResults() {
    this.resultsPanel.style.display = 'none';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Auto-initialize if search input exists
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-searchbox]')) {
    new ModernSearch('[data-searchbox]', '[data-search-results]');
  }
});
