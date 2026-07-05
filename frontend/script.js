async function analyzeCareer() {
    const career = document.getElementById("careerInput")?.value.trim();
    const skills = document.getElementById("skillInput")?.value.trim();
    const currentStatus = document.getElementById("currentStatusInput")?.value.trim();
    const targetDeadline = document.getElementById("targetDeadlineInput")?.value.trim();
    const studyHours = document.getElementById("PractiseHoursInput")?.value.trim();

    const button =
        document.querySelector("button[onclick='analyzeCareer()']") ||
        document.querySelector(".analyze-btn") ||
        document.querySelector(".primary-btn");

    const token = localStorage.getItem("careerAIToken");

    if (!token) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    if (!career || !skills || !currentStatus || !targetDeadline || !studyHours) {
        alert("Please fill all fields before analysis.");
        return;
    }

    try {
        if (button) {
            button.innerHTML = "Analyzing...";
            button.disabled = true;
        }

        const response = await fetch("/analyze", {
            method: "POST",
            headers: getAuthHeaders(true),
            body: JSON.stringify({
                career,
                skills,
                currentStatus,
                targetDeadline,
                studyHours
            })
        });

        const data = await response.json();

        console.log("Career analyze response:", data);

        if (!data.success) {
            alert(data.message || "Career analysis failed.");

            if (button) {
                button.innerHTML = "Analyze Career";
                button.disabled = false;
            }

            return;
        }

        localStorage.setItem("careerResult", data.message || "No analysis result received.");
        localStorage.setItem("careerLoading", "false");

        if (button) {
            button.innerHTML = "Analyze Career";
            button.disabled = false;
        }

        window.location.href = "result.html";

    } catch (error) {
        console.log("Career analyze frontend error:", error);

        alert("Analysis failed. Check browser console and VS Code terminal for the real error.");

        if (button) {
            button.innerHTML = "Analyze Career";
            button.disabled = false;
        }
    }
}

function loadResultPage() {
    const resultBox = document.getElementById("result");
    if (!resultBox) return;

    const isLoading = localStorage.getItem("careerLoading");
    const savedResult = localStorage.getItem("careerResult");

    if (isLoading === "true") {
        resultBox.innerHTML = `
            <div class="loading-box">
                <div class="loader"></div>
                <p>Career AI is analyzing your complete profile...</p>
            </div>
        `;
        setTimeout(loadResultPage, 1200);
        return;
    }

    if (savedResult) {
        resultBox.innerHTML = savedResult;
    } else {
    resultBox.innerHTML = `
        <div class="result-card premium-ai-report">
            <h2>No Career Report Found</h2>

            <div class="result-section">
                <h4>No saved report is available</h4>
                <p>Please go to Career Analysis and generate a new report.</p>
            </div>

            <button onclick="location.href='analyzer.html'">
                Go to Career Analysis
            </button>
        </div>
    `;
}
}

async function loadCareerHistory() {
    const historyBox = document.getElementById("historyBox");
    if (!historyBox) return;

    try {
        const response = await fetch("/history", {
    headers: getAuthHeaders(false)
});
        const data = await response.json();

        if (!data.success || !data.history || data.history.length === 0) {
            historyBox.innerHTML = "<p>No career history found yet.</p>";
            return;
        }

        historyBox.innerHTML = `
            <div class="history-top-bar">
                <button class="delete-all-btn" onclick="deleteAllHistory(event)">
                    Delete All History
                </button>
            </div>

           ${data.history.map(item => `
    <div class="history-item career-history-card" data-id="${item._id}">
        <button class="delete-btn career-delete-btn" data-id="${item._id}">×</button>
        <h3>${item.career || "Career Analysis"}</h3>
        <p><strong>Skills:</strong> ${item.skills || "Not available"}</p>
        <p><strong>Future Demand:</strong> ${item.futureDemandScore || 0}%</p>
    </div>
`).join("")}
        `;

    } catch (error) {
        console.log("Career history loading error:", error);
        historyBox.innerHTML = "<p>Error loading career history.</p>";
    }
}

document.addEventListener("click", function (event) {
    const careerDeleteBtn = event.target.closest(".career-delete-btn");

    if (careerDeleteBtn) {
        event.stopPropagation();
        const id = careerDeleteBtn.dataset.id;
        deleteHistory(event, id);
        return;
    }

    const careerCard = event.target.closest(".career-history-card");

    if (careerCard) {
        const id = careerCard.dataset.id;

        if (!id) {
            alert("Career history ID missing.");
            return;
        }

        openCareerHistoryResult(id);
    }
});

function showHistoryResult(item) {
    const resultHTML = `
        <div class="result-card premium-ai-report">

            <div class="report-title-box">
                <span class="tag">Saved AI Career Report</span>
                <h2>${item.career || "Previous Career Analysis"}</h2>
                <p>This is a saved AI-powered career analysis report with future automation risk insights.</p>
            </div>

            <div class="report-summary-grid">
                <div class="summary-card">
                    <h3>${item.careerScore || 0}%</h3>
                    <p>Career Match Score</p>
                </div>

                <div class="summary-card">
                    <h3>${item.career || "N/A"}</h3>
                    <p>Target Career</p>
                </div>
           <div class="summary-card">
  <div class="resume-card-icon">📈</div>
  <h3>${item.futureDemandScore || 0}%</h3>
  <p>Future Demand</p>
</div>
            </div>

            <div class="result-section">
                <h4>🎯 Career Goal</h4>
                <p>${item.career || "Not available"}</p>
            </div>

            <div class="result-section">
                <h4>🧠 Current Skills</h4>
                <p>${item.skills || "Not available"}</p>
            </div>

            <div class="result-section">
                <h4>📊 Feasibility Rating</h4>
                <p>${item.feasibilityRating || "Not available"}</p>
            </div>

            <div class="result-section">
                <h4>✅ Recommended Skills</h4>
                <p>${item.recommendation || "Not available"}</p>
            </div>

            <div class="result-section">
                <h4>❌ Missing Skills</h4>
                <p>${item.skillGap || "Not available"}</p>
            </div>

            <div class="result-section">
                <h4>🚀 Suggested Roadmap</h4>
                <p>${item.roadmap || "Not available"}</p>
            </div>

            <div class="result-section">
                <h4>⏳ Estimated Completion Time</h4>
                <p>${item.estimatedTime || "Not available"}</p>
            </div>

            <div class="result-section">
                <h4>📌 Final AI Advisory</h4>
                <p>${item.aiAdvisory || "Not available"}</p>
            </div>

            <div class="result-section future-section">
                <h4>⚠️ AI Replacement Risk</h4>
                <p>${item.aiReplacementRisk || "Not available"}</p>
            </div>

            <div class="result-section future-section">
                <h4>🔮 Future Relevance of This Career</h4>
                <p>${item.futureRelevance || "Not available"}</p>
            </div>




            <p class="success-msg">
    ✔ Saved Career AI analysis loaded successfully
</p>

        </div>
    `;

    localStorage.setItem("careerResult", resultHTML);
    localStorage.setItem("careerLoading", "false");
    window.location.href = "result.html";
}

async function openCareerHistoryResult(id) {
    console.log("Opening career history ID:", id);
    try {
        const response = await fetch(`/history/${id}`, {
    headers: getAuthHeaders(false)
});
        const data = await response.json();

        if (!data.success || !data.career) {
            alert("Could not open this career history.");
            return;
        }

        showHistoryResult(data.career);

    } catch (error) {
        console.log("Career history open error:", error);
        alert("Unable to open career history result.");
    }
}

async function deleteHistory(event, id) {
    if (event) event.stopPropagation();

    try {
        await fetch(`/history/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(false)
});
        loadCareerHistory();
    } catch (error) {
        alert("Unable to delete history.");
    }
}

async function deleteAllHistory(event) {
    if (event) event.stopPropagation();

    const confirmDelete = confirm("Delete all career history?");
    if (!confirmDelete) return;

    try {
        await fetch("/history", {
    method: "DELETE",
    headers: getAuthHeaders(false)
});
        loadCareerHistory();
    } catch (error) {
        alert("Unable to delete all history.");
    }
}

function closePopup() {
    const hidePopup = document.getElementById("hidePopup");

    if (hidePopup && hidePopup.checked) {
        localStorage.setItem("popupClosed", "true");
    }

    const popup = document.getElementById("popup");
    if (popup) popup.style.display = "none";
}

function submitPopupReview() {
    const selectedSource = document.querySelector('input[name="source"]:checked');

    if (!selectedSource) {
        alert("Please select how you discovered this website.");
        return;
    }

    localStorage.setItem("audienceSource", selectedSource.value);
    closePopup();
    alert("Thank you for sharing your response.");
}

window.onload = () => {
    const popup = document.getElementById("popup");

    if (popup && localStorage.getItem("showPopupAfterLogin") === "true") {
        popup.style.display = "flex";
        localStorage.removeItem("showPopupAfterLogin");
    }

    loadCareerHistory();
    loadResultPage();
};
let dashboardReports = [];

async function loadDashboardAnalytics() {
    const dashboardPage = document.querySelector(".career-dashboard-template");
    if (!dashboardPage) return;

    try {
        const response = await fetch("/analytics", {
    headers: getAuthHeaders(false)
});
        const data = await response.json();

        if (!data.success) return;

        dashboardReports = data.allReports || [];

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.innerText = value;
        };

        setText("totalAnalyses", data.totalAnalyses || 0);
        setText("totalAnalysesDonut", data.demandTotal || 0);
        setText(
            "totalAnalysesBreakdown",
            `${data.totalCareerReports || 0} Career + ${data.totalResumeReports || 0} Resume reports`
        );

        setText("averageScore", `${data.averageScore || 0}%`);
        setText(
            "averageScoreBreakdown",
            `Career Avg: ${data.careerAverageScore || 0}% | Resume Avg: ${data.resumeAverageScore || 0}%`
        );

        setText("highestScore", `${data.highestScore || 0}%`);
        setText(
            "highestCareer",
            `${data.highestSource || "N/A"}: ${data.highestTitle || "N/A"}`
        );

        setText("averageFutureDemand", `${data.averageFutureDemand || 0}%`);
        setText(
            "futureDemandDetail",
            `Highest Demand: ${data.highestDemandTitle || "N/A"}`
        );

        setText("profileStrengthText", data.profileStrength || "No Data");
        setText("profileStrengthNote", data.profileNote || "Based on Career + Resume data");

        setText("highDemand", data.demandCounts?.high || 0);
        setText("mediumDemand", data.demandCounts?.medium || 0);
        setText("lowDemand", data.demandCounts?.low || 0);

        setText(
            "highDemandCareers",
            data.demandCareerNames?.high?.slice(0, 2).join(", ") || "No reports"
        );

        setText(
            "mediumDemandCareers",
            data.demandCareerNames?.medium?.slice(0, 2).join(", ") || "No reports"
        );

        setText(
            "lowDemandCareers",
            data.demandCareerNames?.low?.slice(0, 2).join(", ") || "No reports"
        );

        const donut = document.querySelector(".donut");
        if (donut) {
            const high = data.demandCounts?.high || 0;
            const medium = data.demandCounts?.medium || 0;
            const low = data.demandCounts?.low || 0;
            const total = high + medium + low;

            if (total > 0) {
                const highPercent = Math.round((high / total) * 100);
                const mediumPercent = Math.round((medium / total) * 100);
                const highEnd = highPercent;
                const mediumEnd = highPercent + mediumPercent;

                donut.style.background = `
                    conic-gradient(
                        #22c55e 0 ${highEnd}%,
                        #f59e0b ${highEnd}% ${mediumEnd}%,
                        #ef4444 ${mediumEnd}% 100%
                    )
                `;
            }
        }

        const chartCanvas = document.getElementById("careerScoreChart");

        if (
            chartCanvas &&
            data.recentAnalyses &&
            data.recentAnalyses.length > 0 &&
            typeof Chart !== "undefined"
        ) {
            const chartItems = data.recentAnalyses.slice().reverse();

            const labels = chartItems.map(item =>
                item.title && item.title.length > 14
                    ? item.title.substring(0, 14) + "..."
                    : item.title || "Report"
            );

            const scores = chartItems.map(item => item.score || 0);

            if (window.careerScoreLineChart) {
                window.careerScoreLineChart.destroy();
            }

            window.careerScoreLineChart = new Chart(chartCanvas, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Readiness Score",
                        data: scores,
                        borderColor: "#c084fc",
                        backgroundColor: "rgba(192,132,252,0.18)",
                        borderWidth: 4,
                        tension: 0.45,
                        fill: true,
                        pointRadius: 5,
                        pointBackgroundColor: "#e879f9"
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { color: "#cbd5e1" },
                            grid: { color: "rgba(255,255,255,0.06)" }
                        },
                        x: {
                            ticks: { color: "#cbd5e1" },
                            grid: { color: "rgba(255,255,255,0.04)" }
                        }
                    }
                }
            });
        }

        dashboardShowAllReports = false;
renderDashboardRecentReports(dashboardReports, false);

        const topBox = document.getElementById("topCareersList");

        if (topBox) {
            if (!data.topCareers || data.topCareers.length === 0) {
                topBox.innerHTML = "<p>No career data available.</p>";
            } else {
                topBox.innerHTML = data.topCareers.slice(0, 5).map(item => `
                    <div class="career-interest-item">
                        <span>${item.career}</span>
                        <strong>${item.count}</strong>
                    </div>
                `).join("");
            }
        }

        const skillCircle = document.querySelector(".skill-circle h2");
        const skillPanelPercent = document.querySelector(".career-bottom-grid .career-panel:nth-child(2) .panel-head span");

        if (skillCircle) {
            skillCircle.innerText = `${data.skillMatchPercent || 0}%`;
        }

        if (skillPanelPercent) {
            skillPanelPercent.innerText = `${data.skillMatchPercent || 0}%`;
        }

        setupDashboardSearch();
        setupDashboardNotifications(data.notifications || []);

    } catch (error) {
        console.log("Dashboard analytics failed:", error);
    }
}

function openDashboardReport(type, id) {
    if (type === "resume") {
        openResumeHistoryResult(id);
    } else {
        openCareerHistoryResult(id);
    }
}
let dashboardShowAllReports = false;

function renderDashboardRecentReports(reports, showAll = false) {
    const recentBox = document.getElementById("recentAnalysesList");
    const viewAllBtn = document.getElementById("viewAllReportsBtn");

    if (!recentBox) return;

    if (!reports || reports.length === 0) {
        recentBox.innerHTML = "<p>No recent analysis found.</p>";
        if (viewAllBtn) viewAllBtn.style.display = "none";
        return;
    }

    const visibleReports = showAll ? reports : reports.slice(0, 3);

    recentBox.innerHTML = visibleReports.map(item => `
        <div class="recent-item" onclick="openDashboardReport('${item.type}', '${item._id}')">
            <div>
                <h4>${item.title || "Unknown Report"}</h4>
                <p>${item.source || "Report"} • ${new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
            <span>${item.score || 0}% Match</span>
        </div>
    `).join("");

    if (viewAllBtn) {
        viewAllBtn.style.display = reports.length > 3 ? "inline" : "none";
        viewAllBtn.innerText = showAll ? "View Less" : "View All";
    }
}

function showAllDashboardReports() {
    dashboardShowAllReports = !dashboardShowAllReports;
    renderDashboardRecentReports(dashboardReports, dashboardShowAllReports);
}
function setupDashboardSearch() {
    const input = document.getElementById("dashboardSearchInput");
    const resultsBox = document.getElementById("dashboardSearchResults");

    if (!input || !resultsBox) return;

    input.addEventListener("input", () => {
        const query = input.value.toLowerCase().trim();

        if (!query) {
            resultsBox.style.display = "none";
            resultsBox.innerHTML = "";
            return;
        }

        const matches = dashboardReports.filter(item => {
            const searchableText = `
                ${item.title || ""}
                ${item.source || ""}
                ${item.type || ""}
                ${item.score || ""}
                ${item.futureDemandScore || ""}
                ${item.skills || ""}
                ${item.missingSkills || ""}
                ${item.recommendedSkills || ""}
            `.toLowerCase();

            return searchableText.includes(query);
        }).slice(0, 6);

        if (matches.length === 0) {
            resultsBox.style.display = "block";
            resultsBox.innerHTML = `<p class="search-empty">No matching reports found.</p>`;
            return;
        }

        resultsBox.style.display = "block";
        resultsBox.innerHTML = matches.map(item => `
            <div class="dashboard-search-item" onclick="openDashboardReport('${item.type}', '${item._id}')">
                <strong>${item.title || "Report"}</strong>
                <p>${item.source || "Saved Report"} • ${item.score || 0}% Match</p>
            </div>
        `).join("");
    });

    document.addEventListener("keydown", (event) => {
        if (event.ctrlKey && event.key.toLowerCase() === "k") {
            event.preventDefault();
            input.focus();
        }
    });
}
document.addEventListener("DOMContentLoaded", loadDashboardAnalytics);
const bgSlider = document.getElementById("bgBrightnessSlider");
const bgPercent = document.getElementById("bgPercent");

function applyBackgroundBrightness(value) {
    value = Number(value);

    let l1, l2, l3;

    if (value < 50) {
        const t = value / 50;
        l1 = 72 - (t * 54);
        l2 = 78 - (t * 57);
        l3 = 84 - (t * 59);
    } else {
        const t = (value - 50) / 50;
        l1 = 18 - (t * 15);
        l2 = 21 - (t * 17);
        l3 = 25 - (t * 20);
    }

    document.documentElement.style.setProperty("--hero-bg-1", `hsl(205, 80%, ${l1}%)`);
    document.documentElement.style.setProperty("--hero-bg-2", `hsl(218, 78%, ${l2}%)`);
    document.documentElement.style.setProperty("--hero-bg-3", `hsl(232, 72%, ${l3}%)`);
    document.documentElement.style.setProperty("--page-bg", `hsl(214, 75%, ${l1}%)`);

    if (bgPercent) bgPercent.innerText = value + "%";
    localStorage.setItem("bgBrightness", value);
}

if (bgSlider) {
    const saved = localStorage.getItem("bgBrightness") || 50;
    bgSlider.value = saved;
    applyBackgroundBrightness(saved);

    bgSlider.addEventListener("input", () => {
        applyBackgroundBrightness(bgSlider.value);
    });
}
function setActiveNavbarLink() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    document.querySelectorAll("nav a, .career-menu a").forEach(link => {
        const href = link.getAttribute("href");

        if (!href) return;

        if (
            (currentPage === "index.html" && href.includes("index.html")) ||
            (currentPage === "dashboard.html" && href.includes("dashboard.html")) ||
            (currentPage === "analyzer.html" && href.includes("analyzer.html")) ||
            (currentPage === "result.html" && href.includes("result.html"))
        ) {
            link.classList.add("active-link");
        }
    });
}

document.addEventListener("DOMContentLoaded", setActiveNavbarLink);
async function analyzeResume() {
    const targetCareer = document.getElementById("resumeCareerInput").value.trim();
    const resumeText = document.getElementById("resumeTextInput").value.trim();
    const jobDescription = document.getElementById("jobDescriptionInput").value.trim();
    const resumeFile = document.getElementById("resumeFileInput").files[0];

    if (!targetCareer || (!resumeText && !resumeFile)) {
        alert("Please enter target career and either upload resume file or paste resume text.");
        return;
    }
    const resumeButton = document.getElementById("resumeAnalyzeBtn");

if (resumeButton) {
    resumeButton.innerHTML = "Analyzing...";
    resumeButton.disabled = true;
}

    localStorage.setItem("resumeLoading", "true");

    const formData = new FormData();
    formData.append("targetCareer", targetCareer);
    formData.append("currentStatus", "Extracted from resume");
    formData.append("resumeText", resumeText);
    formData.append("jobDescription", jobDescription);

    if (resumeFile) {
        formData.append("resumeFile", resumeFile);
    }

    try {
        const response = await fetch("/analyze-resume", {
    method: "POST",
    headers: getAuthHeaders(false),
    body: formData
});

        const data = await response.json();

        localStorage.setItem("resumeResult", data.message || "Resume analysis failed.");
        localStorage.setItem("resumeLoading", "false");

        window.location.href = "resume-result.html";

 } catch (error) {
    if (resumeButton) {
        resumeButton.innerHTML = "Analyzing Resume...";
        resumeButton.disabled = false;
    }

    localStorage.setItem("resumeResult", "<p>Resume analysis failed. Check backend server.</p>");
    localStorage.setItem("resumeLoading", "false");
    window.location.href = "resume-result.html";
}
}
function loadResumeResultPage() {
    const resultBox = document.getElementById("resumeFullResult");
    if (!resultBox) return;

    const isLoading = localStorage.getItem("resumeLoading");
    const savedResult = localStorage.getItem("resumeResult");

    if (isLoading === "true") {
        resultBox.innerHTML = `
            <div class="loading-box">
                <div class="loader"></div>
                <p>AI is analyzing your resume...</p>
            </div>
        `;
        setTimeout(loadResumeResultPage, 1200);
        return;
    }

    resultBox.innerHTML = savedResult || "<p>No resume result found.</p>";
}

document.addEventListener("DOMContentLoaded", loadResumeResultPage);
async function loadResumeHistory() {
    const box = document.getElementById("resumeHistoryBox");
    if (!box) return;

    try {
        const response = await fetch("/resume-history", {
    headers: getAuthHeaders(false)
});
        const data = await response.json();

        if (!data.success || !data.resumes || data.resumes.length === 0) {
            box.innerHTML = "<p>No resume history found yet.</p>";
            return;
        }

        box.innerHTML = data.resumes.map(item => `
            <div class="history-item" onclick="openResumeHistoryResult('${item._id}')">
                <button class="delete-btn" onclick="deleteResumeHistory(event, '${item._id}')">×</button>

                <h3>${item.targetCareer || "Resume Analysis"}</h3>

                <p><strong>Career Match:</strong> ${item.careerScore || 0}%</p>
                <p><strong>Resume Strength:</strong> ${Math.round((Number(item.resumeScore) || 0) / 10)}/10</p>
                <p><strong>Shortlisting Score:</strong> ${Math.round((Number(item.atsScore) || 0) / 10)}/10</p>
                <p><strong>Future Demand:</strong> ${item.futureDemandScore || 0}%</p>
            </div>
        `).join("");

    } catch (error) {
        console.log("Resume history loading error:", error);
        box.innerHTML = "<p>Error loading resume history.</p>";
    }
}

document.addEventListener("DOMContentLoaded", loadResumeHistory);
function safeText(value) {
    return String(value || "Not available")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

async function openResumeHistoryResult(id) {
    try {
        const response = await fetch(`/resume-history/${id}`, {
    headers: getAuthHeaders(false)
});
        const data = await response.json();

        if (!data.success || !data.resume) {
            alert("Could not open this resume history.");
            return;
        }

        const item = data.resume;

        const careerScore = Number(item.careerScore) || 0;
        const resumeStrength = Math.round((Number(item.resumeScore) || 0) / 10);
        const shortlistingScore = Math.round((Number(item.atsScore) || 0) / 10);
        const futureDemand = Number(item.futureDemandScore) || 0;

        const resultHTML = `
            <div class="result-card premium-ai-report">
                <h2>Career Analysis From Resume</h2>

                <div class="report-summary-grid">
                    <div class="summary-card">
                        <div class="resume-card-icon">🎯</div>
                        <h3>${careerScore}%</h3>
                        <p>Career Match Score</p>
                    </div>

                    <div class="summary-card">
                        <div class="resume-card-icon">💼</div>
                        <h3>${resumeStrength}/10</h3>
                        <p>Resume Strength</p>
                        <small>Overall quality of your resume</small>
                    </div>

                    <div class="summary-card">
                        <div class="resume-card-icon">🚀</div>
                        <h3>${shortlistingScore}/10</h3>
                        <p>Resume Shortlisting Score</p>
                        <small>How well your resume passes hiring systems</small>
                    </div>

                    <div class="summary-card">
                        <div class="resume-card-icon">📈</div>
                        <h3>${futureDemand}%</h3>
                        <p>Future Demand</p>
                    </div>
                </div>

                <div class="result-section">
                    <h4>🎯 Career Goal</h4>
                    <p>${safeText(item.targetCareer)}</p>
                </div>

                <div class="result-section">
                    <h4>🎓 Extracted Current Status</h4>
                    <p>${safeText(item.currentStatus)}</p>
                </div>

                <div class="result-section">
                    <h4>🧠 Extracted Skills From Resume</h4>
                    <p>${safeText(item.extractedSkills)}</p>
                </div>

                <div class="result-section">
                    <h4>📊 Feasibility Rating</h4>
                    <p>${safeText(item.feasibilityRating)}</p>
                </div>

                <div class="result-section">
                    <h4>✅ Recommended Skills</h4>
                    <p>${safeText(item.recommendedSkills)}</p>
                </div>

                <div class="result-section">
                    <h4>❌ Missing Skills</h4>
                    <p>${safeText(item.missingSkills)}</p>
                </div>

                <div class="result-section">
                    <h4>🚀 Suggested Roadmap With Time Duration</h4>
                    <p>${safeText(item.roadmap)}</p>
                </div>

                <div class="result-section">
                    <h4>⏳ Estimated Completion Time</h4>
                    <p>${safeText(item.estimatedTime)}</p>
                </div>

                <div class="result-section">
                    <h4>🤖 AI Advisory</h4>
                    <p>${safeText(item.aiAdvisory)}</p>
                </div>

                <div class="result-section future-section">
                    <h4>⚠️ AI Replacement Risk</h4>
                    <p>${safeText(item.aiReplacementRisk)}</p>
                </div>

                <div class="result-section future-section">
                    <h4>🔮 Future Relevance of This Career</h4>
                    <p>${safeText(item.futureRelevance)}</p>
                </div>

                <div class="result-section">
                    <h4>📝 Resume Improvement Suggestions</h4>
                    <p>${safeText(item.improvementSuggestions)}</p>
                </div>

                <p class="success-msg">
                    ✔ Saved resume career analysis loaded successfully
                </p>
            </div>
        `;

        localStorage.setItem("resumeResult", resultHTML);
        localStorage.setItem("resumeLoading", "false");

        window.location.href = "resume-result.html";

    } catch (error) {
        console.log("Resume history open error:", error);
        alert("Unable to open resume history result.");
    }
}
async function deleteResumeHistory(event, id) {
    event.stopPropagation();

    try {
       await fetch(`/resume-history/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(false)
});
        loadResumeHistory();

    } catch (error) {
        alert("Unable to delete resume history.");
    }
}

function setupDashboardNotifications(notifications) {
    const bell = document.getElementById("notificationBell");
    const count = document.getElementById("notificationCount");
    const dropdown = document.getElementById("notificationDropdown");

    if (!bell || !count || !dropdown) return;

    count.innerText = notifications.length || 0;

    if (!notifications || notifications.length === 0) {
        dropdown.innerHTML = `
            <div class="notification-item">
                No dashboard alerts right now.
            </div>
        `;
        return;
    }

    dropdown.innerHTML = notifications.map((note, index) => `
        <div class="notification-group">
            <div class="notification-title" onclick="toggleNotificationReports(${index})">
                <span>${safeText(note.title)}</span>
                <b>▼</b>
            </div>

            <div class="notification-report-list" id="notificationReports${index}">
                ${
                    note.reports && note.reports.length > 0
                    ? note.reports.map(report => `
                        <div class="notification-report" onclick="openDashboardReport('${report.type}', '${report._id}')">
                            <strong>${safeText(report.title)}</strong>
                            <p>${safeText(report.source)} • ${report.score || 0}%</p>
                        </div>
                    `).join("")
                    : `<p class="notification-empty">No report details.</p>`
                }
            </div>
        </div>
    `).join("");

    bell.onclick = function (event) {
        event.stopPropagation();
        dropdown.classList.toggle("show");
    };

    dropdown.onclick = function (event) {
        event.stopPropagation();
    };

    document.addEventListener("click", () => {
        dropdown.classList.remove("show");
    });
}

function toggleNotificationReports(index) {
    const box = document.getElementById(`notificationReports${index}`);
    if (!box) return;

    box.classList.toggle("show");
}

async function registerUser() {
    const name = document.getElementById("registerName")?.value.trim();
    const email = document.getElementById("registerEmail")?.value.trim();
    const password = document.getElementById("registerPassword")?.value.trim();

    if (!name || !email || !password) {
        alert("Please fill all registration fields.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        alert(data.message);

        if (data.success) {
            window.location.href = "login.html";
        }

    } catch (error) {
        alert("Registration failed. Check backend server.");
    }
}


async function loginUser() {
    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value.trim();

    if (!email || !password) {
        alert("Please enter email and password.");
        return;
    }

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        localStorage.setItem("careerAIToken", data.token);
        localStorage.setItem("careerAIUser", JSON.stringify(data.user));
        localStorage.setItem("showPopupAfterLogin", "true");

        alert("Login successful.");
        showLoginSuccessPopup("Login successful! Welcome to CareerAI.");

setTimeout(() => {
  window.location.href = "index.html";
}, 1200);

    } catch (error) {
        alert("Login failed. Check backend server.");
    }
}


function logoutUser() {
    localStorage.removeItem("careerAIToken");
    localStorage.removeItem("careerAIUser");
    window.location.href = "login.html";
}

function protectFrontendPages() {
  const token = localStorage.getItem("careerAIToken");

  const currentPage = window.location.pathname.split("/").pop();

  const publicPages = [
    "",
    "login.html",
    "register.html",
    "forgot-password.html"
  ];

  if (publicPages.includes(currentPage)) {
    return;
  }

  if (!token) {
    window.location.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", protectFrontendPages);

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);

    if (!input) return;

    if (input.type === "password") {
        input.type = "text";
        button.innerText = "🙈";
        button.setAttribute("aria-label", "Hide password");
    } else {
        input.type = "password";
        button.innerText = "👁️";
        button.setAttribute("aria-label", "Show password");
    }
}
// ===============================
// SMART PASSWORD INPUT
// Shows last typed letter for 1 second, then hides it
// Used for login and register pages
// ===============================

const smartPasswordTimers = {};

function maskSmartPassword(hiddenId, visibleId) {
    const hiddenInput = document.getElementById(hiddenId);
    const visibleInput = document.getElementById(visibleId);

    if (!hiddenInput || !visibleInput) return;

    const realPassword = hiddenInput.value;

    if (!realPassword) {
        visibleInput.value = "";
        return;
    }

    visibleInput.value = "•".repeat(realPassword.length);
}

function handleSmartPasswordInput(hiddenId, visibleId) {
    const hiddenInput = document.getElementById(hiddenId);
    const visibleInput = document.getElementById(visibleId);

    if (!hiddenInput || !visibleInput) return;

    if (visibleInput.dataset.showing === "true") {
        hiddenInput.value = visibleInput.value;
        return;
    }

    let realPassword = hiddenInput.value;
    const typedValue = visibleInput.value;

    if (typedValue.length < realPassword.length) {
        realPassword = realPassword.slice(0, typedValue.length);
    } else if (typedValue.length > realPassword.length) {
        const newChar = typedValue.slice(realPassword.length);
        realPassword += newChar;
    }

    hiddenInput.value = realPassword;

    clearTimeout(smartPasswordTimers[hiddenId]);

    if (realPassword.length > 0) {
        visibleInput.value =
            "•".repeat(realPassword.length - 1) +
            realPassword.charAt(realPassword.length - 1);

        smartPasswordTimers[hiddenId] = setTimeout(() => {
            if (visibleInput.dataset.showing !== "true") {
                maskSmartPassword(hiddenId, visibleId);
            }
        }, 1000);
    } else {
        visibleInput.value = "";
    }
}

function toggleSmartPassword(hiddenId, visibleId, button) {
    const hiddenInput = document.getElementById(hiddenId);
    const visibleInput = document.getElementById(visibleId);

    if (!hiddenInput || !visibleInput) return;

    const isShowing = visibleInput.dataset.showing === "true";

    if (isShowing) {
        visibleInput.dataset.showing = "false";
        maskSmartPassword(hiddenId, visibleId);
        button.innerText = "👁️";
        button.setAttribute("aria-label", "Show password");
    } else {
        visibleInput.dataset.showing = "true";
        visibleInput.value = hiddenInput.value;
        button.innerText = "🙈";
        button.setAttribute("aria-label", "Hide password");
    }

    visibleInput.focus();
}
function getCareerAIUser() {
    try {
        return JSON.parse(localStorage.getItem("careerAIUser"));
    } catch (error) {
        return null;
    }
}

function updateAccountUI() {
    const user = getCareerAIUser();

    if (!user) return;

    const nameElements = document.querySelectorAll(".accountName");
    const emailElements = document.querySelectorAll(".accountEmail");
    const initialElements = document.querySelectorAll(".accountInitial");

    nameElements.forEach(el => {
        el.innerText = user.name || "User";
    });

    emailElements.forEach(el => {
        el.innerText = user.email || "No email";
    });

    initialElements.forEach(el => {
        el.innerText = user.name ? user.name.charAt(0).toUpperCase() : "U";
    });
}

function toggleAccountDropdown(event) {
    event.stopPropagation();

    const accountMenu = event.target.closest(".account-menu");
    if (!accountMenu) return;

    const dropdown = accountMenu.querySelector(".account-dropdown");
    if (!dropdown) return;

    document.querySelectorAll(".account-dropdown").forEach(item => {
        if (item !== dropdown) {
            item.classList.remove("show");
        }
    });

    dropdown.classList.toggle("show");
}

document.addEventListener("click", function (event) {
    if (event.target.closest(".account-menu")) return;

    document.querySelectorAll(".account-dropdown").forEach(dropdown => {
        dropdown.classList.remove("show");
    });
});

document.addEventListener("DOMContentLoaded", updateAccountUI);
function getAuthHeaders(isJson = true) {
    const token = localStorage.getItem("careerAIToken");

    const headers = {};

    if (isJson) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}
async function loadProfileSummary() {
    const profilePage = document.querySelector(".profile-dashboard-card");
    if (!profilePage) return;

    const token = localStorage.getItem("careerAIToken");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch("/profile-summary", {
            headers: getAuthHeaders(false)
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.message || "Unable to load profile.");
            return;
        }

        const user = data.user;
        const stats = data.stats;

        document.getElementById("profileName").innerText = user.name || "User";
        document.getElementById("profileEmail").innerText = user.email || "No email";
        document.getElementById("profileCreated").innerText = user.createdAt
            ? new Date(user.createdAt).toLocaleDateString()
            : "Not available";

        document.getElementById("profileStrength").innerText = stats.profileStrength || "New";
        document.getElementById("profileTotalReports").innerText = stats.totalReports || 0;
        document.getElementById("profileCareerReports").innerText = stats.careerReports || 0;
        document.getElementById("profileResumeReports").innerText = stats.resumeReports || 0;

        const editNameInput = document.getElementById("editProfileName");
        if (editNameInput) {
            editNameInput.value = user.name || "";
        }

    } catch (error) {
        console.log("Profile summary frontend error:", error);
        alert("Profile loading failed. Check backend server.");
    }
}


async function updateProfileName() {
    const name = document.getElementById("editProfileName")?.value.trim();

    if (!name || name.length < 2) {
        alert("Name must be at least 2 characters.");
        return;
    }

    try {
        const response = await fetch("/update-profile", {
            method: "PUT",
            headers: getAuthHeaders(true),
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        alert(data.message);

        if (data.success) {
            localStorage.setItem("careerAIUser", JSON.stringify(data.user));
            updateAccountUI();
            loadProfileSummary();
        }

    } catch (error) {
        console.log("Update profile frontend error:", error);
        alert("Profile update failed.");
    }
}


async function changeUserPassword() {
    const currentPassword = document.getElementById("currentPassword")?.value.trim();
    const newPassword = document.getElementById("newPassword")?.value.trim();

    if (!currentPassword || !newPassword) {
        alert("Please enter both current and new password.");
        return;
    }

    if (currentPassword === newPassword) {
        alert("New password cannot be the same as current password.");
        return;
    }

    if (newPassword.length < 6) {
        alert("New password must be at least 6 characters.");
        return;
    }

    try {
        const response = await fetch("/change-password", {
            method: "PUT",
            headers: getAuthHeaders(true),
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();

        alert(data.message);

        if (data.success) {
            logoutUser();
        }

    } catch (error) {
        console.log("Change password frontend error:", error);
        alert("Password change failed.");
    }
}

document.addEventListener("DOMContentLoaded", loadProfileSummary);
// ===============================
// FORGOT PASSWORD + OTP SYSTEM
// ===============================

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const resetPasswordForm = document.getElementById("resetPasswordForm");
const authMessage = document.getElementById("authMessage");

let resetEmail = localStorage.getItem("resetEmail") || "";

function showAuthMessage(message, type = "success") {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.className = type === "success" ? "auth-message success" : "auth-message error";
}

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("forgotEmail")?.value.trim();

    if (!email) {
      showAuthMessage("Please enter your registered email.", "error");
      return;
    }

    try {
      const response = await fetch("/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!data.success) {
        showAuthMessage(data.message || "Failed to send OTP.", "error");
        return;
      }

      resetEmail = email;
      localStorage.setItem("resetEmail", email);

      showAuthMessage("OTP sent to your email.", "success");

      forgotPasswordForm.style.display = "none";
      resetPasswordForm.style.display = "block";

    } catch (error) {
      console.error("Forgot password frontend error:", error);
      showAuthMessage("Something went wrong. Try again.", "error");
    }
  });
}

if (resetPasswordForm) {
  resetPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const otp = document.getElementById("resetOtp")?.value.trim();
    const newPassword = document.getElementById("newPassword")?.value.trim();
    const confirmPassword = document.getElementById("confirmPassword")?.value.trim();

    if (!resetEmail) {
      showAuthMessage("Email not found. Please request OTP again.", "error");
      return;
    }

    if (!otp || !newPassword || !confirmPassword) {
      showAuthMessage("Please fill OTP, new password and confirm password.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showAuthMessage("Password must be at least 6 characters.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAuthMessage("Passwords do not match.", "error");
      return;
    }

    try {
      const response = await fetch("/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: resetEmail,
          otp: otp,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (!data.success) {
        showAuthMessage(data.message || "Password reset failed.", "error");
        return;
      }

      localStorage.removeItem("resetEmail");

      sessionStorage.setItem(
        "loginSuccessMessage",
        "Your password has been reset successfully."
      );

      window.location.href = "login.html";

    } catch (error) {
      console.error("Reset password frontend error:", error);
      showAuthMessage("Something went wrong. Try again.", "error");
    }
  });
}
function showLoginSuccessPopup(message) {
  let popup = document.createElement("div");

  popup.className = "login-success-popup";
  popup.textContent = message;

  document.body.appendChild(popup);

  setTimeout(() => {
    popup.classList.add("show");
  }, 50);

  setTimeout(() => {
    popup.classList.remove("show");
  }, 1000);
}
document.addEventListener("DOMContentLoaded", () => {
  const loginSuccessMessage = sessionStorage.getItem("loginSuccessMessage");

  if (loginSuccessMessage) {
    showLoginSuccessPopup(loginSuccessMessage);
    sessionStorage.removeItem("loginSuccessMessage");
  }
});


// ===============================
// WPR 9 - AI CAREER CHATBOX
// ===============================

function openCareerChat() {
    const overlay = document.getElementById("careerChatOverlay");

    if (!overlay) return;

    overlay.classList.add("show");
    loadCareerChatHistory();
}

function closeCareerChat() {
    const overlay = document.getElementById("careerChatOverlay");

    if (!overlay) return;

    overlay.classList.remove("show");
}

function handleCareerChatEnter(event) {
    if (event.key === "Enter") {
        sendCareerChat();
    }
}

function formatCareerChatText(text) {
    return String(text || "")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/^### (.*$)/gim, "<h4>$1</h4>")
        .replace(/^## (.*$)/gim, "<h4>$1</h4>")
        .replace(/^# (.*$)/gim, "<h4>$1</h4>")
        .replace(/^\* (.*$)/gim, "<li>$1</li>")
        .replace(/^- (.*$)/gim, "<li>$1</li>")
        .replace(/\n/g, "<br>");
}

function appendCareerChatMessage(type, text) {
    const chatBox = document.getElementById("careerChatMessages");

    if (!chatBox) return;

    const messageDiv = document.createElement("div");

    if (type === "user") {
        messageDiv.className = "user-message";
        messageDiv.textContent = text;
    } else if (type === "loading") {
        messageDiv.className = "loading-message";
        messageDiv.textContent = text;
    } else {
        messageDiv.className = "bot-message professional-bot-message";
        messageDiv.innerHTML = formatCareerChatText(text);
    }

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    return messageDiv;
}

async function sendCareerChat() {
    const input = document.getElementById("careerChatInput");
    const sendBtn = document.getElementById("careerChatSendBtn");

    if (!input) return;

    const message = input.value.trim();

    if (!message) {
        alert("Please enter your career question.");
        return;
    }

    const token = localStorage.getItem("careerAIToken");

    if (!token) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

   const clearedMessage = document.querySelector(".cleared-chat-message");

if (clearedMessage) {
    clearedMessage.remove();
}

appendCareerChatMessage("user", message);

input.value = "";
    const loadingBubble = appendCareerChatMessage("loading", "CareerAI is thinking...");

    try {
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerText = "Sending...";
        }

        const response = await fetch("/chat", {
            method: "POST",
            headers: getAuthHeaders(true),
            body: JSON.stringify({
                message: message
            })
        });

        const data = await response.json();

        if (loadingBubble) {
            loadingBubble.remove();
        }

        if (!data.success) {
            appendCareerChatMessage("bot", data.message || "Chatbot failed. Please try again.");
            return;
        }

        appendCareerChatMessage("bot", data.reply || "No reply received.");

    } catch (error) {
        console.log("Career chat frontend error:", error);

        if (loadingBubble) {
            loadingBubble.remove();
        }

        appendCareerChatMessage("bot", "Unable to connect with AI Career Counselor. Check backend server.");

    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerText = "Send";
        }
    }
}

async function loadCareerChatHistory() {
    const chatBox = document.getElementById("careerChatMessages");

    if (!chatBox) return;

    try {
        const response = await fetch("/chat-history", {
            headers: getAuthHeaders(false)
        });

        const data = await response.json();

        if (!data.success || !data.chats || data.chats.length === 0) {
            return;
        }

        chatBox.innerHTML = `
            <div class="bot-message">
                Previous AI Career Counselor conversation loaded.
            </div>
        `;

        data.chats
            .slice()
            .reverse()
            .forEach(chat => {
                appendCareerChatMessage("user", chat.question || "");
                appendCareerChatMessage("bot", chat.answer || "");
            });

    } catch (error) {
        console.log("Career chat history frontend error:", error);
    }
}
async function clearCareerChatHistory() {
    const confirmClear = confirm("Clear all AI Career Counselor chat history?");

    if (!confirmClear) return;

    try {
        const response = await fetch("/chat-history", {
            method: "DELETE",
            headers: getAuthHeaders(false)
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.message || "Unable to clear chat history.");
            return;
        }

        const chatBox = document.getElementById("careerChatMessages");

      if (chatBox) {
    chatBox.innerHTML = `
        <div class="bot-message cleared-chat-message">
            Chat history cleared. Ask me your next career question.
        </div>
    `;
}

    } catch (error) {
        console.log("Clear chat history frontend error:", error);
        alert("Unable to clear chat history. Check backend server.");
    }
}

// ===============================
// AUTH ENTER KEY FIX
// Login + Register
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    const loginInputs = [
        document.getElementById("loginEmail"),
        document.getElementById("loginPasswordVisible")
    ];

    loginInputs.forEach(input => {
        if (!input) return;

        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                loginUser();
            }
        });
    });

    const registerInputs = [
        document.getElementById("registerName"),
        document.getElementById("registerEmail"),
        document.getElementById("registerPasswordVisible")
    ];

    registerInputs.forEach(input => {
        if (!input) return;

        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                registerUser();
            }
        });
    });
});

