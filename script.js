document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const captureBtn = document.getElementById('captureBtn');
    const saveBtn = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn'); // New button
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
    let locations = [];
    let currentPosition = null;
    let currentPhotoBase64 = null;

    // --- Functions ---

    /**
     * Renders the list of saved locations to the DOM.
     * @param {Array} locationsToRender - The array of location objects to display.
     */
    const renderLocations = (locationsToRender) => {
        locationsListDiv.innerHTML = '';
        if (locationsToRender.length === 0) {
            locationsListDiv.innerHTML = `<p class="no-locations">No saved locations found.</p>`;
            return;
        }

        locationsToRender.forEach(location => {
            const locationItem = document.createElement('div');
            locationItem.className = 'location-item';
            
            const photoHTML = location.photo ? `<img src="${location.photo}" alt="Note photo">` : '';
            const mapLink = `https://www.google.com/maps?q=${location.lat},${location.lon}`;

            locationItem.innerHTML = `
                ${photoHTML}
                <div class="location-item-content">
                    <div class="coords">Lat: ${location.lat.toFixed(5)}, Lon: ${location.lon.toFixed(5)}</div>
                    <p class="notes">${location.notes || '<i>No notes provided.</i>'}</p>
                    <div class="timestamp">${new Date(location.id).toLocaleString()}</div>
                    <a href="${mapLink}" target="_blank" rel="noopener noreferrer" class="map-link">View on Map &rarr;</a>
                </div>
            `;
            locationsListDiv.appendChild(locationItem);
        });
    };

    /**
     * Loads locations from localStorage and initializes the view.
     */
    const loadLocationsFromStorage = () => {
        const storedLocations = localStorage.getItem('geoNotesLocations');
        if (storedLocations) {
            locations = JSON.parse(storedLocations);
            locations.sort((a, b) => b.id - a.id);
            renderLocations(locations);
        } else {
            renderLocations([]);
        }
    };
    
    /**
     * Saves the current locations array to localStorage.
     */
    const saveLocationsToStorage = () => {
        localStorage.setItem('geoNotesLocations', JSON.stringify(locations));
    };

    /**
     * Resets the capture form to its initial state.
     */
    const resetCaptureForm = () => {
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
    
    const onGeoSuccess = (position) => {
        currentPosition = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
        };
        statusDiv.textContent = '✅ Location captured successfully!';
        coordsDiv.innerHTML = `Latitude: $${currentPosition.lat.toFixed(5)}$, Longitude: $${currentPosition.lon.toFixed(5)}$`;
        captureDetailsDiv.style.display = 'flex';
        captureBtn.disabled = false;
        captureBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt-fill" viewBox="0 0 16 16">
                <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
            </svg>
            Capture My Location
        `;
    };

    const onGeoError = (error) => {
        let errorMessage = 'An unknown error occurred.';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = '❌ Location access denied. Please enable it in your browser settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = '❌ Location information is unavailable.';
                break;
            case error.TIMEOUT:
                errorMessage = '❌ The request to get user location timed out.';
                break;
        }
        statusDiv.textContent = errorMessage;
        captureBtn.disabled = false;
         captureBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt-fill" viewBox="0 0 16 16">
                <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
            </svg>
            Capture My Location
        `;
    };

    const handlePhotoSelect = (event) => {
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

    /**
     * NEW: Generates and downloads a PDF of all saved locations.
     */
    const exportToPDF = () => {
        if (locations.length === 0) {
            alert('There are no saved locations to export.');
            return;
        }
        
        // Ensure the library is loaded
        if (typeof window.jspdf === 'undefined') {
            alert('PDF generation library is not loaded. Please check your internet connection and try again.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageMargin = 15;
        const contentWidth = doc.internal.pageSize.getWidth() - (pageMargin * 2);
        let cursorY = 20;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('GeoNotes - Saved Locations Export', pageMargin, cursorY);
        cursorY += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, pageMargin, cursorY);
        cursorY += 15;
        
        locations.forEach((location, index) => {
            // Check if there is enough space for the next entry, add new page if not
            const estimatedHeight = 50 + (location.photo ? 50 : 0); // Estimate space needed
            if (cursorY + estimatedHeight > doc.internal.pageSize.getHeight() - pageMargin) {
                doc.addPage();
                cursorY = 20; // Reset Y position for new page
            }

            doc.setDrawColor(200); // Light gray line
            doc.line(pageMargin, cursorY - 5, contentWidth + pageMargin, cursorY - 5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(`Entry #${index + 1}: ${new Date(location.id).toLocaleString()}`, pageMargin, cursorY);
            cursorY += 7;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Coordinates: Lat ${location.lat.toFixed(5)}, Lon ${location.lon.toFixed(5)}`, pageMargin, cursorY);
            cursorY += 10;
            
            if (location.notes) {
                doc.setFont('helvetica', 'bold');
                doc.text('Notes:', pageMargin, cursorY);
                cursorY += 5;
                doc.setFont('helvetica', 'normal');
                // Use splitTextToSize for word wrapping
                const notesLines = doc.splitTextToSize(location.notes, contentWidth);
                doc.text(notesLines, pageMargin, cursorY);
                cursorY += (notesLines.length * 4) + 5; // Adjust Y based on number of lines
            }

            if (location.photo) {
                try {
                    const imgWidth = 60;
                    // You might need to adjust image properties based on your needs
                    doc.addImage(location.photo, 'JPEG', pageMargin, cursorY, imgWidth, 0); // 0 for height maintains aspect ratio
                    cursorY += 50; // Add fixed space for image
                } catch(e) {
                    console.error("Error adding image to PDF:", e);
                    doc.text('[Could not render image]', pageMargin, cursorY);
                    cursorY += 5;
                }
            }
            cursorY += 10; // Extra space between entries
        });

        doc.save(`GeoNotes_Export_${Date.now()}.pdf`);
    };

    // --- Event Listeners ---

    captureBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            statusDiv.textContent = 'Geolocation is not supported by your browser.';
            return;
        }
        
        statusDiv.textContent = '🛰️ Capturing location...';
        captureBtn.disabled = true;
        captureBtn.textContent = 'Locating...';

        navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });

    saveBtn.addEventListener('click', () => {
        if (!currentPosition) {
            alert('Please capture a location first.');
            return;
        }

        const newLocation = {
            id: Date.now(),
            lat: currentPosition.lat,
            lon: currentPosition.lon,
            notes: notesInput.value.trim(),
            photo: currentPhotoBase64
        };

        locations.unshift(newLocation);
        saveLocationsToStorage();
        renderLocations(locations);
        resetCaptureForm();
    });

    photoInput.addEventListener('change', handlePhotoSelect);

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (!searchTerm) {
            renderLocations(locations);
            return;
        }
        
        const filteredLocations = locations.filter(location => 
            location.notes && location.notes.toLowerCase().includes(searchTerm)
        );
        renderLocations(filteredLocations);
    });

    exportBtn.addEventListener('click', exportToPDF); // New listener for the export button

    // --- Initial Load ---
    loadLocationsFromStorage();
});
