// Global State
    let currentSeverity = 'High';
    let currentFile = null;
    let leafletMap = null;
    let currentMarker = null;
    let detectedLocation = {
      address: 'Al Qasimia, Sharjah, United Arab Emirates',
      lat: 25.3463,
      lon: 55.3924
    };

    // Pre-loaded Neighborhood Map Pins
    const mapPins = [
      { lat: 25.3463, lon: 55.3924, type: 'Severe Pothole', location: 'Al Qasimia, Sharjah', severity: 'High' },
      { lat: 25.3520, lon: 55.3890, type: 'Exposed Wiring', location: 'Al Majaz 2, Sharjah', severity: 'Urgent' },
      { lat: 25.2048, lon: 55.2708, type: 'Broken Streetlight', location: 'Downtown Dubai', severity: 'Moderate' },
      { lat: 24.4539, lon: 54.3773, type: 'Road Sign Damaged', location: 'Corniche Road, Abu Dhabi', severity: 'Low' }
    ];

    // Initialize Page
    document.addEventListener('DOMContentLoaded', () => {
      lucide.createIcons();
      setSeverity('High');
      initMap();
      renderFeed();
      // Auto-fetch location on initial launch
      fetchExactGPSLocation();
    });

    // Navigation Tab Switching
    function switchTab(tabId) {
      document.querySelectorAll('.view-tab').forEach(el => el.classList.remove('active'));
      
      const targetNav = document.getElementById(`nav-${tabId}`);
      if (targetNav) {
        document.querySelectorAll('nav button').forEach(btn => {
          btn.className = "px-3 py-1.5 rounded-lg transition-all text-zinc-600 hover:text-zinc-900";
        });
        targetNav.className = "px-3 py-1.5 rounded-lg transition-all text-zinc-900 bg-white shadow-sm";
      }

      const activeView = document.getElementById(`view-${tabId}`);
      if (activeView) {
        activeView.classList.add('active');
      }

      if (tabId === 'map' && leafletMap) {
        setTimeout(() => leafletMap.invalidateSize(), 200);
      }
    }

    // Step Wizard Navigation
    function goToStep(stepNum) {
      [1, 2, 3].forEach(num => {
        document.getElementById(`wizard-step-${num}`).classList.add('hidden');
        const lbl = document.getElementById(`step-lbl-${num}`);
        lbl.className = "flex items-center gap-2 text-zinc-400";
        lbl.querySelector('span').className = "w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center";
      });

      document.getElementById(`wizard-step-${stepNum}`).classList.remove('hidden');
      const activeLbl = document.getElementById(`step-lbl-${stepNum}`);
      activeLbl.className = "flex items-center gap-2 text-sky-600 font-bold";
      activeLbl.querySelector('span').className = "w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center";
    }

    // Severity Selector
    function setSeverity(level) {
      currentSeverity = level;
      document.querySelectorAll('.sev-btn').forEach(btn => {
        btn.className = "sev-btn py-2.5 px-3 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition";
      });
      const activeBtn = document.getElementById(`sev-${level}`);
      if (activeBtn) {
        if (level === 'Urgent') activeBtn.className = "sev-btn py-2.5 px-3 border border-red-300 bg-red-50 text-red-800 rounded-xl text-xs font-semibold transition";
        else if (level === 'High') activeBtn.className = "sev-btn py-2.5 px-3 border border-amber-300 bg-amber-50 text-amber-800 rounded-xl text-xs font-semibold transition";
        else activeBtn.className = "sev-btn py-2.5 px-3 border border-sky-300 bg-sky-50 text-sky-800 rounded-xl text-xs font-semibold transition";
      }
    }

    // File Handling
    function handleFile(file) {
      if (!file) return;
      currentFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById('image-preview').src = e.target.result;
        document.getElementById('preview-container').classList.remove('hidden');
        document.getElementById('file-name-lbl').innerText = file.name;
      };
      reader.readAsDataURL(file);
    }

    function useSamplePhoto(type) {
      const imgPreview = document.getElementById('image-preview');
      const container = document.getElementById('preview-container');
      container.classList.remove('hidden');

      if (type === 'pothole') {
        imgPreview.src = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80";
        document.getElementById('file-name-lbl').innerText = "Sample_Road_Pothole_Damage.jpg";
      } else {
        imgPreview.src = "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=600&q=80";
        document.getElementById('file-name-lbl').innerText = "Sample_Exposed_Utility_Wiring.jpg";
      }
      currentFile = { name: "Sample_Evidence_Photo.jpg" };
    }

    // HIGH ACCURACY LIVE GPS FETCH & REVERSE GEOCODING
    function fetchExactGPSLocation() {
      const locInput = document.getElementById('location-input');
      const coordsBadge = document.getElementById('coords-badge');
      const latlonText = document.getElementById('latlon-text');

      locInput.value = "Fetching precise device location...";

      if (!navigator.geolocation) {
        locInput.value = "Sharjah, United Arab Emirates";
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          
          latlonText.innerText = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
          coordsBadge.classList.remove('hidden');

          detectedLocation.lat = lat;
          detectedLocation.lon = lon;

          // Perform Reverse Geocoding via OpenStreetMap API
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            if (data && data.display_name) {
              locInput.value = data.display_name;
              detectedLocation.address = data.display_name;
            } else {
              locInput.value = `${lat.toFixed(4)}, ${lon.toFixed(4)} (GPS Verified Location)`;
            }
          } catch (e) {
            locInput.value = `Latitude: ${lat.toFixed(4)}, Longitude: ${lon.toFixed(4)}`;
          }

          // Update Map Marker
          if (leafletMap) {
            leafletMap.setView([lat, lon], 14);
            if (currentMarker) leafletMap.removeLayer(currentMarker);
            currentMarker = L.marker([lat, lon]).addTo(leafletMap)
              .bindPopup("<b>Your Detected Live Location</b>").openPopup();
          }
        },
        (err) => {
          locInput.value = "Sharjah, United Arab Emirates";
          coordsBadge.classList.remove('hidden');
          latlonText.innerText = "25.3463° N, 55.3924° E (Default)";
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    // AI REPORT GENERATION & MUNICIPAL ROUTING
    async function generateAIReport() {
      const issueType = document.getElementById('issue-type').value;
      const desc = document.getElementById('issue-desc').value || "Pothole creating immediate road hazard for commuting vehicles.";
      const location = document.getElementById('location-input').value || "Sharjah, United Arab Emirates";
      const apiKey = document.getElementById('api-key-input').value.trim();

      document.getElementById('loading-spinner').classList.remove('hidden');
      document.getElementById('report-output').classList.add('hidden');

      let aiText = "";

      if (apiKey) {
        try {
          const prompt = `Analyze this civic issue report: Type: ${issueType}, Severity: ${currentSeverity}, Description: ${desc}, Location: ${location}. Generate a formal municipal report letter addressing city authorities requesting urgent fix.`;
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          const data = await res.json();
          aiText = data.candidates[0].content.parts[0].text;
        } catch(e) {
          aiText = buildFallbackText(issueType, currentSeverity, desc, location);
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1200));
        aiText = buildFallbackText(issueType, currentSeverity, desc, location);
      }

      document.getElementById('loading-spinner').classList.add('hidden');
      document.getElementById('report-output').classList.remove('hidden');

      document.getElementById('report-text-content').innerHTML = `
        <p><strong>HAZARD TYPE:</strong> ${issueType}</p>
        <p><strong>SEVERITY RATING:</strong> ${currentSeverity.toUpperCase()} HAZARD</p>
        <p><strong>GPS LOCATION:</strong> ${location}</p>
        <hr class="my-2 border-zinc-200" />
        <p class="whitespace-pre-line font-serif text-zinc-900">${aiText}</p>
      `;

      // Update Badge
      const badge = document.getElementById('output-badge');
      badge.innerText = `${currentSeverity.toUpperCase()} SEVERITY`;

      // Smart Municipal Routing
      updateMunicipalLink(location);
    }

    function buildFallbackText(type, severity, desc, location) {
      return `To: The Municipal Roads & Public Works Authority\nLocation: ${location}\nDate: ${new Date().toLocaleDateString()}\n\nSUBJECT: URGENT MUNICIPAL COMPLAINT - ${type.toUpperCase()}\n\nRespected Authorities,\n\nI am formally reporting a critical infrastructure hazard identified at ${location}. The issue involves ${type.toLowerCase()} (${desc}).\n\nGiven its ${severity} severity level, this hazard poses an immediate risk to local traffic, pedestrian safety, and daily family commutes. We urge your maintenance department to inspect and repair this location promptly.\n\nSincerely,\nConcerned Resident & CityFix Community Safety Member`;
    }

    function updateMunicipalLink(locationStr) {
      const muniName = document.getElementById('muni-name');
      const muniLink = document.getElementById('muni-link');

      const locLower = locationStr.toLowerCase();

      if (locLower.includes('dubai')) {
        muniName.innerText = "Dubai Municipality Portal (04 / 800900)";
        muniLink.href = "https://www.dm.gov.ae/faq/";
      } else if (locLower.includes('abu dhabi')) {
        muniName.innerText = "Abu Dhabi TAMM Services Portal";
        muniLink.href = "https://www.tamm.abudhabi/contact";
      } else {
        // Default Sharjah
        muniName.innerText = "Sharjah Municipality Complaints Portal (993)";
        muniLink.href = "https://www.shjmunc.gov.ae/website/ContactUs/481/";
      }
    }

    function copyReportText() {
      const text = document.getElementById('report-text-content').innerText;
      navigator.clipboard.writeText(text);
      alert("Official Report Letter copied to clipboard!");
    }

    // Leaflet Interactive Map Setup
    function initMap() {
      leafletMap = L.map('map-canvas').setView([25.3463, 55.3924], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(leafletMap);

      mapPins.forEach(pin => {
        L.marker([pin.lat, pin.lon]).addTo(leafletMap)
          .bindPopup(`<b>${pin.type}</b><br/>Severity: ${pin.severity}<br/>${pin.location}`);
      });
    }

    function renderFeed() {
      const container = document.getElementById('hazard-feed-container');
      container.innerHTML = mapPins.map(pin => `
        <div class="border border-zinc-200 p-3.5 rounded-xl flex items-center justify-between bg-zinc-50">
          <div>
            <h4 class="text-xs font-bold text-zinc-900">${pin.type}</h4>
            <p class="text-[11px] text-zinc-500">${pin.location}</p>
          </div>
          <span class="px-2 py-0.5 text-[10px] font-bold rounded ${pin.severity === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}">${pin.severity}</span>
        </div>
      `).join('');
    }
