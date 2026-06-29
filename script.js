document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const backendStatus = document.getElementById("backendStatus");
    const statusText = backendStatus.querySelector(".status-text");
    const inboxList = document.getElementById("inboxList");
    const refreshInboxBtn = document.getElementById("refreshInboxBtn");
    
    const emailInput = document.getElementById("emailInput");
    const customerEmailInput = document.getElementById("customerEmail");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const analyzeSpinner = document.getElementById("analyzeSpinner");
    const analyzeBtnText = analyzeBtn.querySelector(".btn-text");
    
    const resultsSection = document.getElementById("resultsSection");
    const resTicketId = document.getElementById("resTicketId");
    const resCategory = document.getElementById("resCategory");
    const resPriority = document.getElementById("resPriority");
    const resSentiment = document.getElementById("resSentiment");
    const resAssignedTeam = document.getElementById("resAssignedTeam");
    const resEta = document.getElementById("resEta");
    const resConfidenceText = document.getElementById("resConfidenceText");
    const resConfidenceBar = document.getElementById("resConfidenceBar");
    const resIntent = document.getElementById("resIntent");
    const resSummary = document.getElementById("resSummary");
    const replyInput = document.getElementById("replyInput");
    
    const approveBtn = document.getElementById("approveBtn");
    const approveSpinner = document.getElementById("approveSpinner");
    const approveBtnText = approveBtn.querySelector(".btn-text");
    
    const rejectBtn = document.getElementById("rejectBtn");
    const rejectSpinner = document.getElementById("rejectSpinner");
    const rejectBtnText = rejectBtn.querySelector(".btn-text");
    
    const notificationBanner = document.getElementById("notificationBanner");
    const notificationMessage = document.getElementById("notificationMessage");
    const closeNotification = document.getElementById("closeNotification");
    

    // Sample Emails
    const samples = {
        tech: "Hi,\nI've been trying to log into my account for the past 2 hours but it keeps saying '500 Internal Server Error'. I need this fixed ASAP as I have a presentation in 4 hours.\nThanks, John",
        billing: "Hello,\nI just checked my credit card statement and I was charged twice for my subscription this month. Can you please refund the extra charge?\nRegards, Sarah",
        refund: "I ordered the XYZ headset last week but when it arrived today, the left ear cup was completely broken. I want a full refund. Order #12345."
    };

    let currentAnalysis = null;
    let currentInbox = [];
    let selectedInboxEmail = null;
    let isBackendOffline = true;

    // Initialize
    checkBackendHealth();

  
    
    emailInput.addEventListener("input", checkInput);
    customerEmailInput.addEventListener("input", checkInput);
    analyzeBtn.addEventListener("click", performAnalysis);
    approveBtn.addEventListener("click", () => submitDecision("approve"));
    rejectBtn.addEventListener("click", () => submitDecision("reject"));
    closeNotification.addEventListener("click", hideNotification);
    refreshInboxBtn.addEventListener("click", loadInbox);

    // Functions
    function checkInput() {
        if (!isBackendOffline) {
            analyzeBtn.disabled = emailInput.value.trim().length === 0 || customerEmailInput.value.trim().length === 0;
        }
    }

    async function checkBackendHealth() {
        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/api/health`, { timeout: 5000 });
            if (res.ok) {
                isBackendOffline = false;
                backendStatus.className = "status-indicator healthy";
                statusText.textContent = "Backend Online";
                checkInput();
                loadInbox();
            } else {
                throw new Error("Bad status");
            }
        } catch (err) {
            isBackendOffline = true;
            backendStatus.className = "status-indicator offline";
            statusText.textContent = "Backend Offline";
            analyzeBtn.disabled = true;
            showNotification("Backend is currently offline or unreachable.", "error");
        }
    }
    async function loadInbox() {
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/inbox`);

        if (!response.ok) {
            throw new Error("Unable to load inbox.");
        }

        currentInbox = await response.json();
        renderInbox();

    } catch (error) {
        inboxList.innerHTML = `
            <div class="inbox-empty">
                Failed to load inbox.
            </div>
        `;
    }
}

function renderInbox() {

    if (!currentInbox.length) {
        inboxList.innerHTML = `
            <div class="inbox-empty">
                Inbox is empty.
            </div>
        `;
        return;
    }

    inboxList.innerHTML = "";

    currentInbox.forEach((email) => {

        const item = document.createElement("div");

        item.className = "inbox-item";

        item.innerHTML = `
            <div class="inbox-subject">${email.subject}</div>
            <div class="inbox-email">${email.customer_email}</div>
            <div class="inbox-time">${formatTime(email.received_at)}</div>
        `;

        item.addEventListener("click", () => {

            document
                .querySelectorAll(".inbox-item")
                .forEach(card => card.classList.remove("active"));

            item.classList.add("active");

            selectInboxEmail(email);

        });

        inboxList.appendChild(item);

    });

}

function selectInboxEmail(email) {

    selectedInboxEmail = email;

    customerEmailInput.value = email.customer_email;

    emailInput.value = email.body;

    resultsSection.classList.add("hidden");

    currentAnalysis = null;

    checkInput();

}

function formatTime(timestamp) {

    if (!timestamp) return "";

    const date = new Date(timestamp);

    return date.toLocaleString();

}

    async function performAnalysis() {
        const emailText = emailInput.value.trim();
        if (!emailText) return;

        setLoadingState(analyzeBtn, analyzeSpinner, analyzeBtnText, true, "Analyzing...");
        resultsSection.classList.add("hidden");

        try {
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailText })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }

            currentAnalysis = await response.json();
            currentAnalysis.customer_email = customerEmailInput.value.trim();
            populateResults(currentAnalysis);
            resultsSection.classList.remove("hidden");
            
        } catch (error) {
            showNotification(`Analysis failed: ${error.message}`, "error");
        } finally {
            setLoadingState(analyzeBtn, analyzeSpinner, analyzeBtnText, false, "Analyze Email");
        }
    }

    function populateResults(data) {
        resTicketId.textContent = data.ticket_id || "-";
        resCategory.textContent = data.category || "-";
        resPriority.textContent = data.priority || "-";
        resSentiment.textContent = data.sentiment || "-";
        resAssignedTeam.textContent = data.assigned_team || "-";
        resEta.textContent = data.estimated_response_time || "-";
        
        const conf = data.confidence || 0;
        resConfidenceText.textContent = `${conf}%`;
        // Small delay to allow CSS transition to work on initial load
        setTimeout(() => {
            resConfidenceBar.style.width = `${conf}%`;
        }, 50);

        resIntent.textContent = data.customer_intent || "-";
        resSummary.textContent = data.summary || "-";
        replyInput.value = data.suggested_reply || "";
    }

    async function submitDecision(action) {
        if (!currentAnalysis) return;

        const btn = action === "approve" ? approveBtn : rejectBtn;
        const spinner = action === "approve" ? approveSpinner : rejectSpinner;
        const textSpan = action === "approve" ? approveBtnText : rejectBtnText;
        const originalText = action === "approve" ? "Approve & Send" : "Reject (Do Not Send)";
        
        const endpoint = action === "approve" ? "/api/approve" : "/api/reject";
        
        // Update the reply with whatever the human edited
        currentAnalysis.suggested_reply = replyInput.value;

        setLoadingState(btn, spinner, textSpan, true, "Processing...");
        
        // Disable both buttons during request
        approveBtn.disabled = true;
        rejectBtn.disabled = true;

        try {
            const response = await fetch(`${CONFIG.BACKEND_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentAnalysis)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }

            showNotification(`Ticket successfully ${action}d!`, "success");
            
            // Reset UI
            setTimeout(() => {
                resultsSection.classList.add("hidden");
                emailInput.value = "";
                customerEmailInput.value = "";
                currentAnalysis = null;
                checkInput();
            }, 1500);

        } catch (error) {
            showNotification(`Failed to ${action} ticket: ${error.message}`, "error");
        } finally {
            setLoadingState(btn, spinner, textSpan, false, originalText);
            approveBtn.disabled = false;
            rejectBtn.disabled = false;
        }
    }

    function setLoadingState(btn, spinner, textSpan, isLoading, text) {
        if (isLoading) {
            btn.disabled = true;
            spinner.classList.remove("hidden");
            textSpan.textContent = text;
        } else {
            btn.disabled = false;
            spinner.classList.add("hidden");
            textSpan.textContent = text;
        }
    }

    function showNotification(message, type) {
        notificationMessage.textContent = message;
        notificationBanner.className = `notification ${type}`;
        
        // Auto hide after 5 seconds
        setTimeout(hideNotification, 5000);
    }

    function hideNotification() {
        notificationBanner.classList.add("hidden");
    }
});
