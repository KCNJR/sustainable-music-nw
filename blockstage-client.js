function initTheme() {
    var savedTheme = localStorage.getItem('smnw_theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('smnw_theme', theme);

    var label = document.getElementById('themeLabel');
    var icon = document.getElementById('themeIcon');
    if (theme === 'dark') {
        if (label) label.innerText = 'Bright';
        if (icon) icon.innerHTML = '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>';
    } else {
        if (label) label.innerText = 'Dark';
        if (icon) icon.innerHTML = '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>';
    }
}

function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
}

var campaigns = [];
var currentCampaign = null;

async function loadActiveCampaigns() {
    try {
        var response = await fetch('/api/campaigns/active');
        var list = await response.json();

        if (!Array.isArray(list)) {
            console.warn('API returned non-array:', list);
            return;
        }

        campaigns = list.map(function(item, index) {
            return {
                id: String(item.id || item.code || ('cmp_' + index)),
                title: item.title || 'Neighborhood Block Concert',
                raised: Number(item.raised) || 0,
                goal: Number(item.goal) || 1500,
                givebutter_url: item.url || (item.slug ? ('https://givebutter.com/' + item.slug) : 'https://givebutter.com'),
                desc: item.description || 'We are pooling funds to bring live music to our neighborhood living room!'
            };
        });

        if (campaigns.length > 0) {
            currentCampaign = currentCampaign ? (campaigns.find(function(c) { return String(c.id) === String(currentCampaign.id); }) || campaigns[0]) : campaigns[0];
            renderGrid();
            renderCampaignDetail();
        } else {
            var gridEl = document.getElementById('neighborhoodGrid');
            if (gridEl) gridEl.innerHTML = '<p style="padding: 1rem; color: var(--text-muted);">No active block parties currently running. Be the first to start one!</p>';
        }
    } catch (err) {
        console.error('Error loading campaigns:', err);
    }
}

function renderGrid() {
    var gridEl = document.getElementById('neighborhoodGrid');
    if (!gridEl || campaigns.length === 0) return;

    gridEl.innerHTML = campaigns.map(function(c) {
        var pct = Math.min(Math.round((c.raised / c.goal) * 100), 100);
        var isActive = (currentCampaign && String(c.id) === String(currentCampaign.id)) ? 'active' : '';
        return '<div class="campaign-selector ' + isActive + '" onclick="selectCampaign(\'' + c.id + '\')">' +
            '<h4>' + c.title + '</h4>' +
            '<div class="meta">$' + c.raised + ' pledged of $' + c.goal + '</div>' +
            '<div class="mini-bar"><div class="mini-bar-fill" style="width: ' + pct + '%;"></div></div>' +
            '</div>';
    }).join('');
}

function selectCampaign(id) {
    var found = campaigns.find(function(c) { return String(c.id) === String(id); });
    if (found) {
        currentCampaign = found;
        renderGrid();
        renderCampaignDetail();
    }
}

function renderCampaignDetail() {
    if (!currentCampaign) return;

    var titleEl = document.getElementById('campaignTitle');
    var descEl = document.getElementById('campaignDesc');
    var fillEl = document.getElementById('progressBarFill');

    if (titleEl) titleEl.innerText = currentCampaign.title;
    if (descEl) descEl.innerHTML = '<div>' + currentCampaign.desc + '</div>';

    var fillPct = Math.min(Math.round((currentCampaign.raised / currentCampaign.goal) * 100), 100);
    if (fillEl) fillEl.style.width = fillPct + '%';

    var raised = currentCampaign.raised;
    var t1Class = raised >= 850 ? 'unlocked' : 'current';
    var t2Class = raised >= 1500 ? 'unlocked' : (raised >= 850 ? 'current' : '');
    var t3Class = raised >= 2000 ? 'unlocked' : (raised >= 1500 ? 'current' : '');

    var tiersGrid = document.getElementById('tiersGrid');
    if (tiersGrid) {
        tiersGrid.innerHTML = '' +
            '<div class="tier-box ' + t1Class + '">' +
                '<span class="tier-tag">' + (raised >= 850 ? 'Event Confirmed!' : 'Base Goal') + '</span>' +
                '<div class="tier-name">Tier 1: Soloist / Duo</div>' +
                '<div class="tier-cost">$850 (Production Confirmed)</div>' +
                '<div class="tier-detail">Covers complete turnkey sound system, certified sound technician, city street permits, and artists.</div>' +
            '</div>' +
            '<div class="tier-box ' + t2Class + '">' +
                '<span class="tier-tag">' + (raised >= 1500 ? 'Unlocked!' : ('$' + raised + ' / $1,500')) + '</span>' +
                '<div class="tier-name">Tier 2: 3–4 Piece Band</div>' +
                '<div class="tier-cost">$1,500 Stretch Goal</div>' +
                '<div class="tier-detail">Expands into a full rhythm section, jazz/soul group, or funk band for dancing.</div>' +
            '</div>' +
            '<div class="tier-box ' + t3Class + '">' +
                '<span class="tier-tag">' + (raised >= 2000 ? 'Unlocked!' : 'Locked') + '</span>' +
                '<div class="tier-name">Tier 3: 5+ Piece Headliner</div>' +
                '<div class="tier-cost">$2,000 Stretch Goal</div>' +
                '<div class="tier-detail">Unlocks a premier neighborhood headliner (Full Brass section, Latin rhythm, or 6-Piece Dance Band).</div>' +
            '</div>';
    }

    var pledgeLink = document.getElementById('pledgeButtonLink');
    if (pledgeLink) pledgeLink.href = currentCampaign.givebutter_url;
}

window.openExplainerModal = function() { 
    var el = document.getElementById('explainerModal');
    if (el) el.style.display = 'flex'; 
};

window.closeExplainerModal = function() { 
    var el = document.getElementById('explainerModal');
    if (el) el.style.display = 'none'; 
};

window.switchToCampaignModal = function() {
    window.closeExplainerModal();
    window.openIntakeModal();
};

window.openIntakeModal = function() { 
    var el = document.getElementById('championModal');
    if (el) el.style.display = 'flex'; 
};

window.closeIntakeModal = function() { 
    var el = document.getElementById('championModal');
    if (el) el.style.display = 'none'; 
};

window.handleFormSubmit = async function(e) {
    e.preventDefault();

    var submitBtn = document.getElementById('submitBtn');
    var originalText = submitBtn ? submitBtn.innerText : 'Submit';
    if (submitBtn) {
        submitBtn.innerText = 'Creating Booking Page & Flyer...';
        submitBtn.disabled = true;
    }

    function val(id, name, fallback) {
        var el = document.getElementById(id) || (e.target.elements ? e.target.elements[name] : null);
        return el ? el.value.trim() : (fallback || '');
    }

    var neighborhoodTitle = val('champ_neighborhood', 'neighborhood_title', 'Neighborhood Block Party');

    var payload = {
        champion_name: val('champ_name', 'champion_name', 'Community Champion'),
        champion_email: val('champ_email', 'champion_email', 'info@sustainablemusicnw.org'),
        neighborhood_title: neighborhoodTitle,
        venue_type: val('champ_venue', 'venue_type', 'street'),
        target_event_date: val('champ_date', 'target_event_date', '2026-08-15'),
        genre_preference: val('champ_genre', 'genre_preference', 'mix'),
        description: val('champ_desc', 'description', 'Funding live, fair-wage music on our street with Sustainable Music Northwest!')
    };

    try {
        var response = await fetch('/api/campaigns/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        var data = await response.json();

        if (data.success) {
            window.closeIntakeModal();

            var downloadUrl = data.flyer_pdf_url || data.flyer_data_url;
            if (downloadUrl) {
                var a = document.createElement('a');
                a.href = downloadUrl;
                a.download = 'BlockStage-Flyer-' + neighborhoodTitle.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
            }

            alert('Success! Your neighborhood booking campaign has been created.\n\nYour promotional flyer has downloaded and an email confirmation has been dispatched.');
            await loadActiveCampaigns();
        } else {
            alert('Error: ' + (data.message || 'Failed to create campaign'));
        }
    } catch (err) {
        console.error('Submission failed:', err);
        alert('Submission failed. Please check your network connection.');
    } finally {
        if (submitBtn) {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    var dateInput = document.getElementById('champ_date');
    if (dateInput) {
        var minDate = new Date();
        minDate.setDate(minDate.getDate() + 60);
        dateInput.min = minDate.toISOString().split('T')[0];
    }
    loadActiveCampaigns();
});
