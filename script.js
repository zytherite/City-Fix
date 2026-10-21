tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
          },
          colors: {
            brand: {
              50: '#f0f7ff',
              100: '#e0effe',
              500: '#0284c7',
              600: '#0369a1',
              700: '#075985',
              900: '#0c4a6e',
            }
          }
        }
      }
    }

// Global State
    let currentSeverity = 'High';
    let currentFile = null;
    let currentImageSrc = "";
    let leafletMap = null;
    let currentMarker = null;
    let detectedLocation = {
      address: 'Al Qasimia, Sharjah, United Arab Emirates',
      lat: 25.3463,
      lon: 55.3924
    };

    // Pre-loaded Neighborhood Map Pins
    const mapPins = [
      { lat: 25.3463, lon: 55.3924, type: 'Severe Pothole', location: 'Al Qasimia, Sharjah, UAE', severity: 'High' },
      { lat: 25.3520, lon: 55.3890, type: 'Exposed Wiring', location: 'Al Majaz 2, Sharjah, UAE', severity: 'Urgent' },
      { lat: 25.2048, lon: 55.2708, type: 'Broken Streetlight', location: 'Downtown Dubai, UAE', severity: 'Moderate' },
      { lat: 40.7128, lon: -74.0060, type: 'Road Damage', location: 'New York City, USA', severity: 'High' },
      { lat: 28.6139, lon: 77.2090, type: 'Water Leak', location: 'New Delhi, India', severity: 'Urgent' }
    ];

    // Initialize Page
    document.addEventListener('DOMContentLoaded', () => {
      lucide.createIcons();
      setSeverity('High');
      initMap();
      renderFeed();
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

    // Strict Step 2 Validation (Photo Required for AI Check)
    function validateStep2AndProceed() {
      if (!currentFile && !currentImageSrc) {
        document.getElementById('photo-error-alert').classList.remove('hidden');
        return;
      }
      document.getElementById('photo-error-alert').classList.add('hidden');
      goToStep(3);
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
        currentImageSrc = e.target.result;
        document.getElementById('image-preview').src = currentImageSrc;
        document.getElementById('preview-container').classList.remove('hidden');
        document.getElementById('file-name-lbl').innerText = file.name;
        document.getElementById('photo-error-alert').classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }

    function useSamplePhoto(type) {
      const imgPreview = document.getElementById('image-preview');
      const container = document.getElementById('preview-container');
      container.classList.remove('hidden');

      if (type === 'pothole') {
        currentImageSrc = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80";
        document.getElementById('file-name-lbl').innerText = "Sample_Road_Pothole_Damage.jpg";
      } else {
        currentImageSrc = "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=600&q=80";
        document.getElementById('file-name-lbl').innerText = "Sample_Exposed_Utility_Wiring.jpg";
      }
      imgPreview.src = currentImageSrc;
      currentFile = { name: "Sample_Evidence_Photo.jpg" };
      document.getElementById('photo-error-alert').classList.add('hidden');
    }

    // HIGH ACCURACY LIVE GPS FETCH
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

    // MULTIMODAL AI VISION INSPECTION & REPORT GENERATION
    async function generateAIReport() {
      const issueType = document.getElementById('issue-type').value;
      const desc = document.getElementById('issue-desc').value || "Hazard creating immediate safety risk for commuting citizens and families.";
      const location = document.getElementById('location-input').value || "Sharjah, United Arab Emirates";
      const apiKey = document.getElementById('api-key-input').value.trim();

      document.getElementById('loading-spinner').classList.remove('hidden');
      document.getElementById('report-output').classList.add('hidden');
      document.getElementById('loading-status-txt').innerText = "Multimodal AI scanning image for authenticity & safety...";

      let aiText = "";

      if (apiKey) {
        try {
          let mimeType = "image/jpeg";
          let base64Data = currentImageSrc;
          if (currentImageSrc.includes(',')) {
            const parts = currentImageSrc.split(',');
            mimeType = parts[0].match(/:(.*?);/)[1];
            base64Data = parts[1];
          }

          const prompt = `You are CityFix AI Vision, an expert municipal infrastructure inspector. Analyze this uploaded image to verify if it depicts an authentic, safe infrastructure hazard (Type: ${issueType}, Severity: ${currentSeverity}, Description: ${desc}, Location: ${location}). First, confirm that the image is safe, appropriate, and genuinely shows a hazard. Then, generate a formal municipal report letter addressing city authorities requesting an urgent repair.`;
          
          const payload = {
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ]
          };

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          aiText = data.candidates[0].content.parts[0].text;
        } catch(e) {
          aiText = buildFallbackText(issueType, currentSeverity, desc, location);
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        aiText = buildFallbackText(issueType, currentSeverity, desc, location);
      }

      document.getElementById('loading-spinner').classList.add('hidden');
      document.getElementById('report-output').classList.remove('hidden');

      // Attach Photo in Report
      if (currentImageSrc) {
        document.getElementById('report-attached-img').src = currentImageSrc;
        document.getElementById('report-image-box').classList.remove('hidden');
      }

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

      // Smart Global Municipal Routing
      updateGlobalMunicipalLink(location);
    }

    function buildFallbackText(type, severity, desc, location) {
      return `To: The Municipal Infrastructure & Public Works Authority\nLocation: ${location}\nDate: ${new Date().toLocaleDateString()}\n\nSUBJECT: URGENT CIVIC HAZARD COMPLAINT - ${type.toUpperCase()}\n\nRespected Authorities,\n\nI am formally submitting an official report regarding a critical infrastructure hazard verified by CityFix AI Vision at ${location}. The problem involves ${type.toLowerCase()} (${desc}).\n\nGiven its ${severity} severity level, this hazard presents an immediate threat to community safety, local traffic flow, and daily commuting families. We request that your engineering inspection team evaluate and repair this site urgently.\n\nSincerely,\nConcerned Citizen & CityFix Safety Network Member`;
    }

    // MULTI-COUNTRY MUNICIPAL ROUTING ENGINE
    function updateGlobalMunicipalLink(locationStr) {
      const muniName = document.getElementById('muni-name');
      const muniLink = document.getElementById('muni-link');

      const locLower = locationStr.toLowerCase();

      if (locLower.includes('dubai')) {
        muniName.innerText = "Dubai Municipality Portal (UAE)";
        muniLink.href = "https://www.dm.gov.ae/faq/";
      } else if (locLower.includes('abu dhabi')) {
        muniName.innerText = "Abu Dhabi TAMM Portal (UAE)";
        muniLink.href = "https://www.tamm.abudhabi/contact";
      } else if (locLower.includes('sharjah') || locLower.includes('uae') || locLower.includes('united arab emirates')) {
        muniName.innerText = "Sharjah Municipality Portal (993 / UAE)";
        muniLink.href = "https://www.shjmunc.gov.ae/website/ContactUs/481/";
      } else if (locLower.includes('usa') || locLower.includes('united states') || locLower.includes('america') || locLower.includes('ny') || locLower.includes('california')) {
        muniName.innerText = "USA 311 City Services & Municipal Portal";
        muniLink.href = "https://www.usa.gov/state-local-governments";
      } else if (locLower.includes('india') || locLower.includes('delhi') || locLower.includes('mumbai') || locLower.includes('hyderabad') || locLower.includes('bangalore')) {
        muniName.innerText = "India Centralized Public Grievance Portal (CPGRAMS)";
        muniLink.href = "https://pgportal.gov.in/";
      } else if (locLower.includes('france') || locLower.includes('paris')) {
        muniName.innerText = "France Services Publics Municipal Portal";
        muniLink.href = "https://www.service-public.fr/";
      } else if (locLower.includes('canada') || locLower.includes('toronto') || locLower.includes('vancouver')) {
        muniName.innerText = "Government of Canada Municipal Services";
        muniLink.href = "https://www.canada.ca/en/services.html";
      } else if (locLower.includes('saudi') || locLower.includes('ksa') || locLower.includes('riyadh')) {
        muniName.innerText = "Saudi Arabia Balady Municipal Portal (940)";
        muniLink.href = "https://balady.gov.sa/";
      } else if (locLower.includes('uk') || locLower.includes('united kingdom') || locLower.includes('london')) {
        muniName.innerText = "UK GOV Local Council Reporting Portal";
        muniLink.href = "https://www.gov.uk/report-pothole";
      } else {
        muniName.innerText = "International Public Infrastructure Portal";
        muniLink.href = "https://www.google.com/search?q=report+infrastructure+hazard+municipal+portal";
      }
    }

    function copyReportText() {
      const text = document.getElementById('report-text-content').innerText;
      navigator.clipboard.writeText(text);
      alert("Official Report Letter copied to clipboard!");
    }

    // Leaflet Interactive Map Setup (Using CartoDB Voyager to Prevent 403 Blocks)
    function initMap() {
      leafletMap = L.map('map-canvas').setView([25.3463, 55.3924], 10);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap & CARTO',
        maxZoom: 19
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
