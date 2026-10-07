// -- Map Setup --
const map = L.map('map').setView([38.5, -95.0], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const markers = [];
let activeCard = null;

function createMarkerIcon(avatar) {
  return L.divIcon({
    className: '',
    html: `<div class="marker-pin">${avatar}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -44]
  });
}

function buildPopup(a) {
  return `
    <div class="popup-card">
      <div class="popup-avatar">${a.avatar}</div>
      <div class="popup-info">
        <strong>${a.name}</strong>
        <span class="popup-position">${a.position}</span>
        <span class="popup-company">${a.company}</span>
        <div class="popup-meta">
          <span>🎓 ${a.major}</span>
          <span>📅 Class of ${a.gradYear}</span>
          <span>📍 ${a.city}</span>
        </div>
        <p class="popup-bio">"${a.bio}"</p>
      </div>
    </div>
  `;
}

function renderMap(list) {
  markers.forEach(m => map.removeLayer(m.marker));
  markers.length = 0;

  list.forEach(a => {
    const marker = L.marker([a.lat, a.lng], { icon: createMarkerIcon(a.avatar) })
      .addTo(map)
      .bindPopup(buildPopup(a), { maxWidth: 320 });
    markers.push({ id: a.id, marker });
  });
}

// -- Sidebar List --
function renderList(list) {
  const container = document.getElementById('alumni-list');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<p class="no-results">No alumni found.</p>';
    return;
  }

  list.forEach(a => {
    const card = document.createElement('div');
    card.className = 'alumni-card';
    card.setAttribute('data-id', a.id);
    card.innerHTML = `
      <div class="card-avatar">${a.avatar}</div>
      <div class="card-info">
        <strong>${a.name}</strong>
        <span>${a.position} &middot; ${a.company}</span>
        <span class="card-meta">${a.major} &middot; Class of ${a.gradYear}</span>
        <span class="card-city">📍 ${a.city}</span>
      </div>
    `;
    card.addEventListener('click', () => focusAlumni(a));
    container.appendChild(card);
  });
}

function focusAlumni(a) {
  // Highlight card
  document.querySelectorAll('.alumni-card').forEach(c => c.classList.remove('active'));
  const card = document.querySelector(`.alumni-card[data-id="${a.id}"]`);
  if (card) card.classList.add('active');

  // Fly to marker and open popup
  const m = markers.find(m => m.id === a.id);
  if (m) {
    map.flyTo([a.lat, a.lng], 10, { duration: 1.2 });
    setTimeout(() => m.marker.openPopup(), 1300);
  }
}

// -- Filter / Search --
function filterAlumni() {
  const query = document.getElementById('search').value.toLowerCase();
  const major = document.getElementById('filter-major').value;
  const year = document.getElementById('filter-year').value;

  const filtered = alumniData.filter(a => {
    const matchQuery = !query ||
      a.name.toLowerCase().includes(query) ||
      a.major.toLowerCase().includes(query) ||
      a.city.toLowerCase().includes(query) ||
      a.company.toLowerCase().includes(query) ||
      a.position.toLowerCase().includes(query);

    const matchMajor = !major || a.major === major;
    const matchYear = !year || a.gradYear === parseInt(year);

    return matchQuery && matchMajor && matchYear;
  });

  renderMap(filtered);
  renderList(filtered);
}

// -- View Toggle --
function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(`view-${view}`).classList.add('active');
  event.target.classList.add('active');

  if (view === 'map') {
    setTimeout(() => map.invalidateSize(), 100);
  }
}

// -- Survey Match Logic --
function submitSurvey(e) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);

  const major = data.get('major');
  const career = data.get('career');
  const location = data.get('location');
  const name = data.get('name');

  // Score each alumni
  const scored = alumniData.map(a => {
    let score = 0;
    if (a.major === major) score += 3;
    if (a.career === career) score += 3;
    if (locationMatch(a.city, location)) score += 2;
    return { alumni: a, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3).map(s => s.alumni);

  showMatchResult(name, top);
}

function locationMatch(city, locationPref) {
  const regions = {
    'Northeast (NY, DC, MD, VA)': ['New York', 'Washington', 'Baltimore'],
    'Southeast (GA, FL, NC, SC)': ['Atlanta'],
    'Midwest (IL, OH, MI)': ['Chicago'],
    'Southwest (TX, AZ)': ['Houston', 'Austin'],
    'West Coast (CA, WA, OR)': ['Mountain View', 'Los Angeles', 'Portland'],
    'Open to Anywhere': []
  };

  if (locationPref === 'Open to Anywhere') return true;
  const cities = regions[locationPref] || [];
  return cities.some(c => city.includes(c));
}

function showMatchResult(studentName, matches) {
  const result = document.getElementById('match-result');
  result.classList.remove('hidden');

  result.innerHTML = `
    <div class="match-header">
      <h3>🎓 Great news, ${studentName}!</h3>
      <p>We found ${matches.length} Hampton alumni that match your profile.</p>
    </div>
    <div class="match-cards">
      ${matches.map((a, i) => `
        <div class="match-card" style="animation-delay: ${i * 0.1}s">
          <div class="match-rank">#${i + 1} Match</div>
          <div class="match-avatar">${a.avatar}</div>
          <div class="match-details">
            <strong>${a.name}</strong>
            <span>${a.position} at ${a.company}</span>
            <span>📍 ${a.city}</span>
            <div class="match-tags">
              <span class="tag">${a.major}</span>
              <span class="tag">Class of ${a.gradYear}</span>
            </div>
            <p class="match-bio">"${a.bio}"</p>
            <button class="connect-btn" onclick="viewOnMap(${a.id})">View on Map</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  result.scrollIntoView({ behavior: 'smooth' });
}

function viewOnMap(id) {
  const alumni = alumniData.find(a => a.id === id);
  if (!alumni) return;

  // Switch to map view
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-map').classList.add('active');
  document.querySelectorAll('.nav-btn')[0].classList.add('active');

  setTimeout(() => {
    map.invalidateSize();
    focusAlumni(alumni);
  }, 150);
}

// -- Init --
renderMap(alumniData);
renderList(alumniData);
