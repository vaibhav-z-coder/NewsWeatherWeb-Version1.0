        const els = {
            body: document.body,
            form: document.getElementById("searchForm"),
            cityInput: document.getElementById("cityInput"),
            categorySelect: document.getElementById("categorySelect"),
            locationBtn: document.getElementById("locationBtn"),
            weatherStatus: document.getElementById("weatherStatus"),
            temperature: document.getElementById("temperature"),
            cityName: document.getElementById("cityName"),
            conditionText: document.getElementById("conditionText"),
            weatherIcon: document.getElementById("weatherIcon"),
            humidity: document.getElementById("humidity"),
            windSpeed: document.getElementById("windSpeed"),
            feelsLike: document.getElementById("feelsLike"),
            activeCategory: document.getElementById("activeCategory"),
            newsRegion: document.getElementById("newsRegion"),
            articleCount: document.getElementById("articleCount"),
            newsGrid: document.getElementById("newsGrid"),
            newsStatus: document.getElementById("newsStatus"),
            forecastTemps: document.querySelectorAll("[data-forecast-temp]"),
            forecastTimes: document.querySelectorAll("[data-forecast-time]"),
            forecastIcons: document.querySelectorAll("[data-forecast-icon]")
        };

        const mockArticles = [
            {
                title: "City prepares smart weather response system for sudden climate shifts",
                description: "Local officials are testing faster public alerts and improved coordination for heavy rain, heat, and wind events.",
                source: { name: "Metro Daily" },
                publishedAt: new Date().toISOString(),
                urlToImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
                url: "https://news.google.com/"
            },
            {
                title: "Technology teams build new dashboards for public information access",
                description: "Developers are combining maps, live conditions, and alerts to improve how citizens read important updates.",
                source: { name: "Tech Wire" },
                publishedAt: new Date().toISOString(),
                urlToImage: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
                url: "https://news.google.com/"
            },
            {
                title: "Health experts share precautions during changing weather conditions",
                description: "Experts recommend hydration, shade, and regular checks on vulnerable people during extreme temperature changes.",
                source: { name: "Health Desk" },
                publishedAt: new Date().toISOString(),
                urlToImage: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80",
                url: "https://news.google.com/"
            }
        ];

        let map;
        let marker;
        let currentCity = "Delhi";
        let currentCountryCode = "in";

        function showLoader(target, message) {
            target.innerHTML = `
                <div class="loader-wrap">
                    <div>
                        <div class="loader"></div>
                        <p>${message}</p>
                    </div>
                </div>
            `;
        }

        function showMessage(target, message) {
            target.innerHTML = `<div class="message-box">${message}</div>`;
        }

        function setWeatherTheme(weatherMain, temp) {
            els.body.classList.remove("hot", "rainy", "cloudy");
            const text = weatherMain.toLowerCase();

            if (text.includes("rain") || text.includes("drizzle") || text.includes("thunder")) {
                els.body.classList.add("rainy");
                return;
            }

            if (temp >= 30 || text.includes("clear")) {
                els.body.classList.add("hot");
                return;
            }

            if (text.includes("cloud") || text.includes("mist") || text.includes("haze")) {
                els.body.classList.add("cloudy");
            }
        }

        async function fetchWeatherByCity(city) {
            const response = await fetch(`/api/weather/city?city=${encodeURIComponent(city)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Weather API failed");
            }

            return data;
        }

        async function fetchWeatherByCoords(lat, lon) {
            const response = await fetch(`/api/weather/coords?lat=${lat}&lon=${lon}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Weather API failed");
            }

            return data;
        }

        async function fetchForecast(lat, lon) {
            const response = await fetch(`/api/weather/forecast?lat=${lat}&lon=${lon}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Forecast API failed");
            }

            return data;
        }

        async function fetchNews(city, category) {
            const query = encodeURIComponent(city || currentCity || "Delhi");
            const selectedCategory = encodeURIComponent(category || "general");
            const url = `/api/news?q=${query}&category=${selectedCategory}`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                console.log("Frontend News Data:", data);

                if (!response.ok || data.status !== "ok") {
                    throw new Error(data.message || "News API failed");
                }

                const cleanArticles = (data.articles || []).filter(article =>
                    article.title &&
                    article.url &&
                    !article.title.includes("[Removed]") &&
                    !article.url.includes("consent.yahoo.com")
                );

                return cleanArticles.length ? cleanArticles : mockArticles;
            } catch (error) {
                console.warn("Backend news route failed. Showing mock articles instead.", error);
                return mockArticles;
            }
        }

        function renderWeather(data) {
            const temp = Math.round(data.main.temp);
            const weather = data.weather[0];
            currentCity = data.name || currentCity;
            currentCountryCode = data.sys?.country ? data.sys.country.toLowerCase() : currentCountryCode;

            els.temperature.textContent = `${temp}°`;
            els.cityName.textContent = `${data.name}, ${data.sys?.country || ""}`;
            els.conditionText.textContent = weather.description;
            els.weatherIcon.src = `https://openweathermap.org/img/wn/${weather.icon}@4x.png`;
            els.weatherIcon.alt = weather.description;
            els.humidity.textContent = `${data.main.humidity}%`;
            els.windSpeed.textContent = `${data.wind.speed} m/s`;
            els.feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
            els.weatherStatus.textContent = `Updated weather for ${data.name}`;
            els.newsRegion.textContent = data.sys?.country || "Local";
            setWeatherTheme(weather.main, temp);

            if (data.coord) updateMap(data.coord.lat, data.coord.lon, data.name);
        }

        function renderForecast(data) {
            if (!data?.list) return;

            const hourly = data.list.slice(0, 6);

            hourly.forEach((item, index) => {
                if (els.forecastTemps[index]) {
                    els.forecastTemps[index].textContent = `${Math.round(item.main.temp)}°`;
                }

                if (els.forecastTimes[index]) {
                    els.forecastTimes[index].textContent = new Date(item.dt * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                    });
                }

                if (els.forecastIcons[index]) {
                    const icon = item.weather?.[0]?.icon || "01d";
                    const desc = item.weather?.[0]?.description || "Forecast";
                    els.forecastIcons[index].src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
                    els.forecastIcons[index].alt = desc;
                }
            });
            renderWeeklyForecast(data);
        }

        function buildWeeklyForecast(list) {
    const groupedDays = new Map();

    list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const key = date.toLocaleDateString("en-CA");

        if (!groupedDays.has(key)) groupedDays.set(key, []);
        groupedDays.get(key).push(item);
    });

    const todayKey = new Date().toLocaleDateString("en-CA");
const upcomingDays = Array.from(groupedDays.entries())
    .filter(([key]) => key !== todayKey)
    .map(([, value]) => value)
    .slice(0, 5);

return upcomingDays.map(dayItems => {
        const temps = dayItems.map(item => item.main.temp);
        const mainItem = dayItems.find(item => {
            const hour = new Date(item.dt * 1000).getHours();
            return hour >= 11 && hour <= 14;
        }) || dayItems[0];

        return {
            date: new Date(mainItem.dt * 1000),
            max: Math.round(Math.max(...temps)),
            min: Math.round(Math.min(...temps)),
            humidity: mainItem.main.humidity,
            wind: Math.round(mainItem.wind.speed * 3.6),
            icon: mainItem.weather?.[0]?.icon || "01d",
            desc: mainItem.weather?.[0]?.description || "Forecast"
        };
    });
}

function renderWeeklyForecast(data) {
    const grid = document.getElementById("weeklyForecastGrid");
    const location = document.getElementById("weeklyForecastLocation");

    if (!grid || !data?.list) return;

    const weekly = buildWeeklyForecast(data.list);

    if (location) {
        location.textContent = `${data.city?.name || currentCity || "Selected location"} • Next 5 days weather overview`;
    }

    grid.innerHTML = weekly.map(day => `
        <article class="weekly-card">
            <span class="day-name">${day.date.toLocaleDateString([], { weekday: "short" })}</span>
            <span class="date-label">${day.date.toLocaleDateString([], { month: "short", day: "numeric" })}</span>

            <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="${day.desc}">

            <div class="weekly-temp">
                <strong>${day.max}°</strong>
                <span>${day.min}°</span>
            </div>

            <p class="weekly-desc">${day.desc}</p>

            <div class="weekly-details">
                <div class="weekly-detail">
                    <span>Humidity</span>
                    <strong>${day.humidity}%</strong>
                </div>
                <div class="weekly-detail">
                    <span>Wind</span>
                    <strong>${day.wind} km/h</strong>
                </div>
            </div>
        </article>
    `).join("");
}

        function renderNews(articles) {
            if (!articles.length) {
                els.articleCount.textContent = "0 articles";
                showMessage(els.newsGrid, "No articles available for this category or region.");
                return;
            }

            els.articleCount.textContent = `${articles.length} articles`;
            els.newsStatus.textContent = `Showing ${els.categorySelect.value} headlines near ${currentCity}.`;
            els.newsGrid.innerHTML = articles.slice(0, 9).map(article => {
                const image = article.urlToImage || "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80";
                const date = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Latest";
                const source = article.source?.name || "News Source";
                const title = article.title || "Untitled article";
                const desc = article.description || "Open the article to read the complete story.";
                const url = article.url || "https://news.google.com/";

                return `
                    <article class="news-card">
                        <img src="${image}" alt="${title.replaceAll('"', '&quot;')}" loading="lazy">
                        <div class="news-content">
                            <div class="news-meta">
                                <span>${source}</span>
                                <span>${date}</span>
                            </div>
                            <h3>${title}</h3>
                            <p>${desc}</p>
                            <a href="${url}" target="_blank" rel="noopener noreferrer">Read Full Article</a>
                        </div>
                    </article>
                `;
            }).join("");
        }

        async function loadDashboardByCity(city) {
            try {
                els.weatherStatus.textContent = "Loading weather data...";
                showLoader(els.newsGrid, "Loading news articles...");
                const weather = await fetchWeatherByCity(city);
                renderWeather(weather);
               try {
    if (weather.coord) {
        const forecast = await fetchForecast(weather.coord.lat, weather.coord.lon);
        renderForecast(forecast);
    }
} catch (err) {
    console.warn("Forecast failed:", err);
}
                const news = await fetchNews(currentCity, els.categorySelect.value);
                renderNews(news);
            } catch (error) {
                els.weatherStatus.textContent = error.message;
                showMessage(els.newsGrid, "Unable to load weather data. Check your OpenWeather key, city name, or wait 10-30 minutes if the key is newly created.");
            }
        }

        async function loadDashboardByCoords(lat, lon) {
            try {
                els.weatherStatus.textContent = "Loading map location weather...";
                showLoader(els.newsGrid, "Loading local headlines...");
                const weather = await fetchWeatherByCoords(lat, lon);
                renderWeather(weather);
                try {
    const forecast = await fetchForecast(lat, lon);
    renderForecast(forecast);
} catch (err) {
    console.warn("Forecast failed:", err);
}
                const news = await fetchNews(currentCity, els.categorySelect.value);
                renderNews(news);
            } catch (error) {
                els.weatherStatus.textContent = error.message;
                showMessage(els.newsGrid, "Could not load weather/news for this map location.");
            }
        }

        function updateMap(lat, lon, label) {
            if (!map) return;
            map.setView([lat, lon], 10);
            if (!marker) {
                marker = L.marker([lat, lon]).addTo(map);
            } else {
                marker.setLatLng([lat, lon]);
            }
            marker.bindPopup(label || "Selected location").openPopup();
        }

        function initMap() {
            map = L.map("map", { zoomControl: true }).setView([28.6139, 77.2090], 7);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap contributors"
            }).addTo(map);

            marker = L.marker([28.6139, 77.2090]).addTo(map).bindPopup("Delhi").openPopup();

            map.on("click", event => {
                const { lat, lng } = event.latlng;
                loadDashboardByCoords(lat, lng);
            });
        }

        function useBrowserLocation() {
            if (!window.isSecureContext) {
                els.weatherStatus.textContent = "Location needs HTTPS or localhost. Loading Delhi by default.";
                loadDashboardByCity("Delhi");
                return;
            }

            if (!navigator.geolocation) {
                els.weatherStatus.textContent = "Geolocation is not supported. Loading Delhi by default.";
                loadDashboardByCity("Delhi");
                return;
            }

            els.weatherStatus.textContent = "Requesting location permission...";
            navigator.geolocation.getCurrentPosition(
                position => {
                    loadDashboardByCoords(position.coords.latitude, position.coords.longitude);
                },
                error => {
                    const messages = {
                        1: "Location permission denied. Loading Delhi by default.",
                        2: "Location unavailable. Loading Delhi by default.",
                        3: "Location request timed out. Loading Delhi by default."
                    };
                    els.weatherStatus.textContent = messages[error.code] || "Location failed. Loading Delhi by default.";
                    loadDashboardByCity("Delhi");
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        }

        els.form.addEventListener("submit", event => {
            event.preventDefault();
            const city = els.cityInput.value.trim();
            if (!city) {
                els.weatherStatus.textContent = "Enter a city name first.";
                return;
            }
            loadDashboardByCity(city);
        });

        els.categorySelect.addEventListener("change", async () => {
            els.activeCategory.textContent = els.categorySelect.options[els.categorySelect.selectedIndex].text;
            showLoader(els.newsGrid, "Refreshing category headlines...");
            try {
                const news = await fetchNews(currentCity, els.categorySelect.value);
                renderNews(news);
            } catch (error) {
                showMessage(els.newsGrid, "News API failed. Showing fallback content.");
                renderNews(mockArticles);
            }
        });

        els.locationBtn.addEventListener("click", useBrowserLocation);

        initMap();
        showLoader(els.newsGrid, "Preparing dashboard...");
        useBrowserLocation();
        const nextDaysBtn = document.getElementById("nextDaysBtn");
const forecastModal = document.getElementById("forecastModal");
const closeForecastBtns = document.querySelectorAll("[data-close-forecast]");

function openForecastModal() {
    forecastModal.classList.add("show");
    forecastModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
}

function closeForecastModal() {
    forecastModal.classList.remove("show");
    forecastModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
}

if (nextDaysBtn && forecastModal) {
    nextDaysBtn.addEventListener("click", openForecastModal);
}

closeForecastBtns.forEach((btn) => {
    btn.addEventListener("click", closeForecastModal);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeForecastModal();
    }
});