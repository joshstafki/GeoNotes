// --- Import Firebase v9 Modular Functions ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- This is your web app's Firebase configuration ---
// It should be declared ONLY ONCE.
// PLEASE USE A NEW, SECURE API KEY THAT YOU HAVE NOT SHARED.
const firebaseConfig = {
    apiKey: "USE_YOUR_NEW_SECURE_API_KEY_HERE",
    authDomain: "geonotes-app-9ab52.firebaseapp.com",
    projectId: "geonotes-app-9ab52",
    storageBucket: "geonotes-app-9ab52.appspot.com", // Corrected this for you from the previous version
    messagingSenderId: "747628008728",
    appId: "1:747628008728:web:42a8b89cb588f7bfc63a6d",
    measurementId: "G-GB0BBR6D9M"
};

// --- Initialize Firebase and its services ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let locationsCollection; // This will point to the current user's data

// --- DOM Element References ---
const mainContent = document.getElementById('main-content');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userInfoDiv = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const userPhoto = document.getElementById('user-photo');
const captureBtn = document.getElementById('captureBtn');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');
const coordsDiv = document.getElementById('coords');
const notesInput = document.getElementById('notesInput');
const photoInput = document.getElementById('photoInput');
const fileNameSpan = document.getElementById('fileName');
const imagePreview = document.getElementById('imagePreview');
const searchInput = document.getElementById('searchInput');
const locationsListDiv = document.getElementById('locationsList');
const captureDetailsDiv = document.getElementById('capture-details');

// --- Application State ---
let localLocationsCache = []; // A local copy of the data to power the search function
let currentPosition = null;
let currentPhotoBase64 = null;

// --- Firebase Authentication ---
const provider = new GoogleAuthProvider();

// Set up Sign-In and Sign-Out button clicks
signInBtn.onclick = () => signInWithPopup(auth, provider);
signOutBtn.onclick = () => signOut(auth);

// This function listens for changes in login state (the most important part of auth)
onAuthStateChanged(auth, user => {
    if (user) {
        // --- User is signed IN ---
        mainContent.classList.remove('hidden');
        userInfoDiv.classList.remove('hidden');
        signInBtn.classList.add('hidden');

        // Update the UI with the user's name and photo
        userNameSpan.textContent = user.displayName;
        userPhoto.src = user.photoURL;

        // Create a reference to this specific user's "locations" collection in Firestore
        locationsCollection = collection(db, 'users', user.uid, 'locations');
        fetchLocationsFromFirestore();

    } else {
        // --- User is signed OUT ---
        mainContent.classList.add('hidden');
        userInfoDiv.classList.add('hidden');
        signInBtn.classList.remove('hidden');

        // Clear any displayed data
        localLocationsCache = [];
        renderLocations([]);
    }
});

// --- Firestore & Data Handling ---
const fetchLocationsFromFirestore = async () => {
    if (!locationsCollection) return;
    try {
        // Create a query to get locations, ordered by the newest first
        const q = query(locationsCollection, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        // Convert the Firestore documents into a usable JavaScript array
        localLocationsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderLocations(localLocationsCache);
    } catch (error) {
        console.error("Error fetching locations: ", error);
        statusDiv.textContent = "Error loading saved locations.";
    }
};

const saveLocationToFirestore = async (newLocation) => {
    if (!locationsCollection) return;
    try {
        // Add the new location object to the user's collection in Firestore
        await addDoc(locationsCollection, newLocation);
        fetchLocationsFromFirestore(); // Refresh the list from the database
    } catch (error) {
        console.error("Error saving location: ", error);
        alert("Could not save the location. Please try again.");
    }
};

// --- UI & Rendering ---
const renderLocations = (locationsToRender) => {
    locationsListDiv.innerHTML = '';
    if (locationsToRender.length === 0) {
        locationsListDiv.innerHTML = `<p class="no-locations">No saved locations found. Sign in to see your cloud-saved notes!</p>`;
        return;
    }
    locationsToRender.forEach(location => {
        const locationItem = document.createElement('div');
        locationItem.className = 'location-item';
        
        const photoHTML = location.photo ? `<img src="${location.photo}" alt="Note photo">` : '';
        const mapLink = `http://googleusercontent.com/maps/google.com/2{location.lat},${location.lon}`;
        // Firestore timestamps need to be converted to JS dates to be readable
        const timestamp = location.createdAt ? location.createdAt.toDate().toLocaleString() : 'Just now';

        locationItem.innerHTML = `
            ${photoHTML}
            <div class="location-item-content">
                <div class="coords">Lat: ${location.lat.toFixed(5)}, Lon: ${location.lon.toFixed(5)}</div>
                <p class="notes">${location.notes || '<i>No notes provided.</i>'}</p>
                <div class="timestamp">${timestamp}</div>
                <a href="${mapLink}" target="_blank" rel="noopener noreferrer" class="map-link">View on Map →</a>
            </div>
        `;
        locationsListDiv.appendChild(locationItem);
    });
};

// --- Event Listeners & Geolocation ---
saveBtn.addEventListener('click', () => {
    if (!currentPosition) {
        alert('Please capture a location first.');
        return;
    }
    const newLocation = {
        lat: currentPosition.lat,
        lon: currentPosition.lon,
        notes: notesInput.value.trim(),
        photo: currentPhotoBase64,
        createdAt: serverTimestamp() // Let Firestore add the current time on the server
    };
    saveLocationToFirestore(newLocation);
    resetCaptureForm();
});

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (!searchTerm) {
        renderLocations(localLocationsCache);
        return;
    }
    // Filter the locally cached data for a fast search experience
    const filtered = localLocationsCache.filter(loc => loc.notes && loc.notes.toLowerCase().includes(searchTerm));
    renderLocations(filtered);
});

captureBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        statusDiv.textContent = 'Geolocation is not supported by your browser.';
        return;
    }
    statusDiv.textContent = '🛰️ Capturing location...';
    captureBtn.disabled = true;
    captureBtn.textContent = 'Locating...';
    navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
});

photoInput.addEventListener('change', handlePhotoSelect);

// --- Helper Functions ---
function resetCaptureForm() {
    statusDiv.textContent = 'Click the button to get your current coordinates.';
    coordsDiv.textContent = 'N/A';
    notesInput.value = '';
    photoInput.value = '';
    fileNameSpan.textContent = 'No file chosen';
    imagePreview.src = '';
    imagePreview.classList.add('image-preview-hidden');
    captureDetailsDiv.style.display = 'none';
    currentPosition = null;
    currentPhotoBase64 = null;
};

function onGeoSuccess(position) {
    currentPosition = { lat: position.coords.latitude, lon: position.coords.longitude };
    statusDiv.textContent = '✅ Location captured successfully!';
    coordsDiv.innerHTML = `Latitude: $${currentPosition.lat.toFixed(5)}$, Longitude: $${currentPosition.lon.toFixed(5)}$`;
    captureDetailsDiv.style.display = 'flex';
    captureBtn.disabled = false;
    captureBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt-fill" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg> Capture My Location`;
};

function onGeoError(error) {
    let errorMessage = 'An unknown error occurred.';
    switch (error.code) {
        case error.PERMISSION_DENIED: errorMessage = '❌ Location access denied. Please enable it in your browser settings.'; break;
        case error.POSITION_UNAVAILABLE: errorMessage = '❌ Location information is unavailable.'; break;
        case error.TIMEOUT: errorMessage = '❌ The request to get user location timed out.'; break;
    }
    statusDiv.textContent = errorMessage;
    captureBtn.disabled = false;
    captureBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt-fill" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg> Capture My Location`;
};

function handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        currentPhotoBase64 = null;
        fileNameSpan.textContent = 'No file chosen';
        imagePreview.src = '';
        imagePreview.classList.add('image-preview-hidden');
        return;
    }
    fileNameSpan.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
        currentPhotoBase64 = e.target.result;
        imagePreview.src = currentPhotoBase64;
        imagePreview.classList.remove('image-preview-hidden');
    };
    reader.readAsDataURL(file);
};
