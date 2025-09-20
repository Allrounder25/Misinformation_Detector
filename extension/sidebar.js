let fetchController = null;

function displayResults(data) {
  const loadingOverlay = document.getElementById('loading-overlay');
  const homepageContainer = document.getElementById('homepage-container');
  const analysisResultsContainer = document.getElementById('analysis-results-container');
  const headingContainer = document.getElementById("heading-container");
  const percentageContainer = document.getElementById("percentage-container");
  const briefInfoContainer = document.getElementById("brief-info-container");
  const reasoningContainer = document.getElementById("reasoning-container");
  const sourcesContainer = document.getElementById("sources-container");
  const resultsContainer = document.getElementById("results-container");
  const modelSelect = document.getElementById('model-select');

  // Hide loading overlay and homepage
  loadingOverlay.style.display = 'none';
  homepageContainer.style.display = 'none';
  analysisResultsContainer.style.display = 'block';
  modelSelect.disabled = false;

  // Clear previous results
  headingContainer.innerHTML = "";
  percentageContainer.innerHTML = "";
  briefInfoContainer.innerHTML = "";
  reasoningContainer.innerHTML = "";
  sourcesContainer.innerHTML = "";
  resultsContainer.innerHTML = "";

  if (data.error) {
    analysisResultsContainer.style.display = 'none';
    resultsContainer.innerHTML = `<p>Error: ${data.error}</p>`;
  } else if (data.heading && data.percentage !== undefined && data.brief_info !== undefined && data.sources !== undefined) {
    headingContainer.innerHTML = data.heading;
    percentageContainer.innerHTML = `${data.percentage}%`;
    briefInfoContainer.innerHTML = `<p>${data.brief_info}</p>`;
    reasoningContainer.innerHTML = `<p>${data.reasoning}</p>`;

    if (data.sources.length > 0) {
      let sourcesHtml = `<h3>Sources:</h3><ul>`;
      data.sources.forEach(source => {
        sourcesHtml += `<li><a href="${source}" target="_blank">${source}</a></li>`;
      });
      sourcesHtml += `</ul>`;
      sourcesContainer.innerHTML = sourcesHtml;
    } else {
      sourcesContainer.innerHTML = `<p>No specific sources found.</p>`;
    }
  } else {
    resultsContainer.innerHTML = "<p>Unexpected analysis format.</p>";
    console.error("Unexpected analysis format:", data);
  }

  // Store results in session storage
  sessionStorage.setItem('analysisResults', JSON.stringify(data));
}

function showHomepage() {
  const homepageContainer = document.getElementById('homepage-container');
  const loadingOverlay = document.getElementById('loading-overlay');
  const analysisResultsContainer = document.getElementById('analysis-results-container');

  homepageContainer.style.display = 'block';
  loadingOverlay.style.display = 'none';
  analysisResultsContainer.style.display = 'none';
}

function fetchAnalysis() {
  if (fetchController) {
    fetchController.abort();
  }
  fetchController = new AbortController();
  const signal = fetchController.signal;

  const loadingOverlay = document.getElementById('loading-overlay');
  const headingContainer = document.getElementById("heading-container");
  const homepageContainer = document.getElementById('homepage-container');
  const analysisResultsContainer = document.getElementById('analysis-results-container');
  const modelSelect = document.getElementById('model-select');

  loadingOverlay.style.display = 'flex';
  homepageContainer.style.display = 'none';
  analysisResultsContainer.style.display = 'none';
  modelSelect.disabled = true;

  chrome.storage.local.get(["selectedText", "url", "selectedModel"], (data) => {
    if (data.selectedText && data.url) {
      const model = data.selectedModel || 'gemini-2.5-flash-lite';
      headingContainer.innerHTML = `Analyzing: "${data.selectedText.substring(0, 50)}..."`;

      fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: data.selectedText, url: data.url, model: model }),
        signal
      })
      .then(response => response.json())
      .then(analysis => {
        displayResults(analysis);
        // Clear selected text from storage
        chrome.storage.local.remove(["selectedText", "url"]);
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error("Error:", error);
          displayResults({ error: "Could not connect to the backend." });
        }
      });
    }
  });
}

window.addEventListener('message', (event) => {
  if (event.data.action === 'analyze') {
    fetchAnalysis();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('model-select');
  const captureBtn = document.getElementById('capture-btn');

  chrome.storage.local.get("selectedModel", (data) => {
    if (data.selectedModel) {
      modelSelect.value = data.selectedModel;
    }
  });

  modelSelect.addEventListener('change', (event) => {
    chrome.storage.local.set({ selectedModel: event.target.value });
  });

  captureBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startCapture' });
  });

  const analysisResults = sessionStorage.getItem('analysisResults');
  if (analysisResults) {
    displayResults(JSON.parse(analysisResults));
  } else {
    showHomepage();
  }
});

function fetchImageAnalysis(imageData) {
  if (fetchController) {
    fetchController.abort();
  }
  fetchController = new AbortController();
  const signal = fetchController.signal;

  const loadingOverlay = document.getElementById('loading-overlay');
  const headingContainer = document.getElementById("heading-container");
  const homepageContainer = document.getElementById('homepage-container');
  const analysisResultsContainer = document.getElementById('analysis-results-container');
  const modelSelect = document.getElementById('model-select');

  loadingOverlay.style.display = 'flex';
  homepageContainer.style.display = 'none';
  analysisResultsContainer.style.display = 'none';
  modelSelect.disabled = true;

  chrome.storage.local.get(["url", "selectedModel"], (data) => {
    if (data.url) {
      const model = data.selectedModel || 'gemini-1.5-flash';
      headingContainer.innerHTML = 'Analyzing captured image...';

      fetch("http://localhost:8000/analyze_image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData, url: data.url, model: model  }),
        signal
      })
      .then(response => response.json())
      .then(analysis => {
        displayResults(analysis);
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error("Error:", error);
          displayResults({ error: "Could not connect to the backend." });
        }
      });
    } else {
        console.error("Error: URL not found for image analysis.");
        displayResults({ error: "Could not determine the URL for image analysis." });
    }
  });
}

window.addEventListener('message', (event) => {
  if (event.data.action === 'analyze') {
    fetchAnalysis();
  } else if (event.data.action === 'capturedImageData') {
    fetchImageAnalysis(event.data.imageData);
  }
});
