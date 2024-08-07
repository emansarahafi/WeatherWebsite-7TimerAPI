document.addEventListener("DOMContentLoaded", function() {
    const citySelect = document.getElementById('citySelect');
    const forecastContainer = document.getElementById('forecastContainer');
    let placeholderDisabled = false; // Flag to track if placeholder is disabled

    // Load city data from CSV and populate dropdown
    fetch('city_coordinates.csv')
        .then(response => response.text())
        .then(text => {
            const rows = text.split('\n');
            const fragment = document.createDocumentFragment();
            const placeholder = document.createElement('option');
            placeholder.textContent = 'Select a city';
            placeholder.disabled = true;
            placeholder.selected = true;
            fragment.appendChild(placeholder);

            rows.forEach((row, index) => {
                if (index === 0) return; // Skip header row
                const [latitude, longitude, city, country] = row.split(',');
                if (city && country) {
                    const option = document.createElement('option');
                    option.value = `${latitude},${longitude}`;
                    option.textContent = `${city}, ${country}`;
                    option.dataset.city = city; // Store city name in data attribute
                    fragment.appendChild(option);
                }
            });

            citySelect.appendChild(fragment);
        })
        .catch(error => console.error('Error loading city data:', error));

    // Event listener for dropdown change
    citySelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const [latitude, longitude] = selectedOption.value.split(',');
        if (latitude && longitude) {
            fetchWeatherData(latitude, longitude);

            // Disable the placeholder option if not already disabled
            if (!placeholderDisabled) {
                citySelect.querySelector('option:disabled').disabled = true;
                placeholderDisabled = true; // Set flag to true after disabling placeholder
            }
        }
    });

    function fetchWeatherData(lat, lon) {
        const apiUrl = `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=astro&output=xml`;

        fetch(apiUrl)
            .then(response => response.text())
            .then(data => parseWeatherData(data))
            .catch(error => console.error('Error fetching data:', error));
    }

    function parseWeatherData(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        // Clear previous cards
        forecastContainer.innerHTML = '';

        // Extract data and create cards
        const dataSeries = xmlDoc.querySelectorAll('dataseries data');
        let daysData = {};

        dataSeries.forEach(data => {
            const timepoint = data.getAttribute('timepoint');
            const date = new Date();
            date.setHours(timepoint.split('h')[0]);
            date.setMinutes(0);
            date.setSeconds(0);
            date.setMilliseconds(0);

            const day = date.toDateString();

            if (!daysData[day]) {
                daysData[day] = {
                    temp: [],
                    cloudcover: [],
                    seeing: [],
                    transparency: [],
                    liftedIndex: [],
                    rh2m: [],
                    windDirection: '',
                    windSpeed: [],
                    precType: ''
                };
            }

            daysData[day].temp.push(parseFloat(data.querySelector('temp2m')?.textContent.trim() || 0));
            daysData[day].cloudcover.push(parseFloat(data.querySelector('cloudcover')?.textContent.trim() || 0));
            daysData[day].seeing.push(parseFloat(data.querySelector('seeing')?.textContent.trim() || 0));
            daysData[day].transparency.push(parseFloat(data.querySelector('transparency')?.textContent.trim() || 0));
            daysData[day].liftedIndex.push(parseFloat(data.querySelector('lifted_index')?.textContent.trim() || 0));
            daysData[day].rh2m.push(parseFloat(data.querySelector('rh2m')?.textContent.trim() || 0));
            daysData[day].windDirection = data.querySelector('wind10m_direction')?.textContent.trim() || daysData[day].windDirection;
            daysData[day].windSpeed.push(parseFloat(data.querySelector('wind10m_speed')?.textContent.trim() || 0));
            daysData[day].precType = data.querySelector('prec_type')?.textContent.trim() || daysData[day].precType;
        });

        Object.keys(daysData).forEach(day => {
            const data = daysData[day];
            const card = document.createElement('div');
            card.className = 'col-md-4 mb-4';
            card.innerHTML = `
                <div class="card">
                    <img src="images/${mapConditionToImage(data.precType)}" alt="${data.precType}" class="card-img-top">
                    <div class="card-body">
                        <h5 class="card-title">${day}</h5>
                        <p class="card-text">Temperature: ${average(data.temp)}°C</p>
                        <p class="card-text">Cloud Cover: ${average(data.cloudcover)}</p>
                        <p class="card-text">Seeing: ${average(data.seeing)}</p>
                        <p class="card-text">Transparency: ${average(data.transparency)}</p>
                        <p class="card-text">Lifted Index: ${average(data.liftedIndex)}</p>
                        <p class="card-text">Relative Humidity: ${average(data.rh2m)}%</p>
                        <p class="card-text">Wind Direction: ${data.windDirection}</p>
                        <p class="card-text">Wind Speed: ${average(data.windSpeed)} km/h</p>
                        <p class="card-text">Condition: ${data.precType}</p>
                    </div>
                </div>
            `;
            forecastContainer.appendChild(card);
        });
    }

    function mapConditionToImage(precType) {
        const mapping = {
            none: 'clear.png',
            rain: 'rain.png',
            snow: 'snow.png',
            sleet: 'lightrain.png',
            fog: 'fog.png',
            cloudy: 'cloudy.png',
            pcloudy: 'pcloudy.png',
            tsrain: 'tsrain.png',
            ishow: 'ishower.png',
            oshow: 'oshower.png',
            lightsnow: 'lightsnow.png',
            tstorm: 'tstorm.png',
            humid: 'humid.png',
            mcloudy: 'mcloudy.png',
            rainsnow: 'rainsnow.png',
            windy: 'windy.png',
            cloudyday: 'cloudy.png'
        };
        return mapping[precType] || 'clear.png';
    }

    function average(arr) {
        return arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 'N/A';
    }
});
