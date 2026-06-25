/**
 * Trackr - Developer Learning Playground Frontend
 * 
 * This file contains simple, beginner-friendly JavaScript code designed to help 
 * you learn how a frontend client interacts with a FastAPI backend database.
 * 
 * FEATURES FOR LEARNING:
 * 1. Request Inspector Panel: Intercepts all HTTP calls and shows request/response data on screen.
 * 2. Connection Health Bar: Polls your backend server to tell you if it's connected or offline.
 * 3. Clear JSON Schema Comments: Shows you exactly what payload your FastAPI code needs to accept/return.
 */

// ==========================================================================
// ⚙️ CONFIGURATION & STATE VARIABLES
// ==========================================================================

// You can edit the base URL directly here or in the text input inside the UI.
let API_BASE_URL = 'http://localhost:8000';

// Simple authentication token state stored in the browser session.
// sessionStorage is similar to localStorage but wipes automatically when you close the browser tab.
let userToken = sessionStorage.getItem('dev_token') || null;
let userEmail = sessionStorage.getItem('dev_email') || null;

// Cache of applications loaded from the backend (used for client-side search/filtering)
let applicationsList = [];

// ==========================================================================
// 🔎 HTTP REQUEST INSPECTOR & LOGGER
// ==========================================================================

/**
 * Updates the Request Inspector panel in the UI with request details.
 */
function inspectRequest(method, url, requestBody) {
    console.log(`📡 [API REQUEST] ${method} ${url}`, requestBody || '');
    
    document.getElementById('inspect-method-url').textContent = `${method} ${url}`;
    document.getElementById('inspect-status').textContent = 'Pending...';
    document.getElementById('inspect-status').className = 'code-box'; // reset classes
    
    const requestBodyElement = document.getElementById('inspect-request-body');
    if (requestBody) {
        requestBodyElement.textContent = JSON.stringify(requestBody, null, 2);
    } else {
        requestBodyElement.textContent = 'None / Empty';
    }
    
    // Clear response box until it arrives
    document.getElementById('inspect-response-body').textContent = 'Waiting for server response...';
}

/**
 * Updates the Request Inspector panel in the UI with response details.
 */
function inspectResponse(statusCode, statusText, responseBody) {
    console.log(`📥 [API RESPONSE] Status: ${statusCode} ${statusText}`, responseBody || '');
    
    const statusBox = document.getElementById('inspect-status');
    statusBox.textContent = `${statusCode} ${statusText}`;
    
    // Color status box based on code success
    if (statusCode >= 200 && statusCode < 300) {
        statusBox.className = 'code-box text-green';
    } else {
        statusBox.className = 'code-box text-red';
    }
    
    const responseBodyElement = document.getElementById('inspect-response-body');
    if (responseBody) {
        responseBodyElement.textContent = JSON.stringify(responseBody, null, 2);
    } else {
        responseBodyElement.textContent = 'None / Empty (e.g. 204 No Content)';
    }
}

// ==========================================================================
// 📡 CORE API FUNCTIONS (YOUR FASTAPI INTEGRATION POINTS)
// ==========================================================================

/**
 * TODO: Implement this endpoint in FastAPI!
 * 
 * HTTP Endpoint: GET /health
 * Description: Pings backend to check database connection and server health.
 * 
 * Expected FastAPI Response (JSON):
 * {
 *   "status": "ok",
 *   "database": "connected"
 * }
 */
async function testHealth() {
    const url = `${API_BASE_URL}/health`;
    
    // Log the request to inspector panel
    inspectRequest('GET', url, null);
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Log the response to inspector panel
        inspectResponse(response.status, response.statusText, data);
        showToast('Health check complete!');
        return true;
    } catch (error) {
        inspectResponse(500, 'Offline / Network Error', { error: error.message });
        showToast('Backend is offline.', 'error');
        return false;
    }
}

/**
 * TODO: Implement this endpoint in FastAPI!
 * 
 * HTTP Endpoint: POST /auth/register
 * Description: Inserts a new user record into PostgreSQL. Remember to hash passwords!
 * 
 * Expected Request Payload (JSON):
 * {
 *   "username": "john_doe",
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 * 
 * Expected FastAPI Response (JSON):
 * {
 *   "message": "User registered successfully!"
 * }
 */
async function registerUser(username, email, password) {
    const url = `${API_BASE_URL}/auth/register`;
    const payload = { username, email, password };
    
    inspectRequest('POST', url, payload);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    inspectResponse(response.status, response.statusText, data);
    
    if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
    }
    
    return data;
}

/**
 * TODO: Implement this endpoint in FastAPI!
 * 
 * HTTP Endpoint: POST /auth/login
 * Description: Verifies credentials, generates JWT access token, and returns it.
 * 
 * Expected Request Payload (JSON):
 * {
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 * 
 * Expected FastAPI Response (JSON):
 * {
 *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "token_type": "bearer",
 *   "user": {
 *     "email": "john@example.com"
 *   }
 * }
 * 
 * NOTE ON OAUTH2 FORM DATA:
 * If your FastAPI backend uses FastAPI's built-in OAuth2PasswordRequestForm,
 * it will expect Form-urlencoded data (e.g. username=john%40example.com&password=password123)
 * instead of JSON body. If so, modify the fetch options body to: 
 * body: new URLSearchParams({ username: email, password: password })
 */
async function loginUser(email, password) {
    const url = `${API_BASE_URL}/auth/login`;
    const payload = { email, password };
    
    inspectRequest('POST', url, payload);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    inspectResponse(response.status, response.statusText, data);
    
    if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
    }
    
    // Save Token & Email
    userToken = data.access_token;
    userEmail = data.user ? data.user.email : email;
    sessionStorage.setItem('dev_token', userToken);
    sessionStorage.setItem('dev_email', userEmail);
    
    return data;
}

/**
 * TODO: Implement this endpoint in FastAPI!
 * 
 * HTTP Endpoint: GET /applications
 * Description: Queries PostgreSQL and returns all job applications belonging to the user.
 * 
 * Required Headers: Authorization: Bearer <JWT_TOKEN>
 * 
 * Expected FastAPI Response (JSON Array):
 * [
 *   {
 *     "id": 1,
 *     "company_name": "Google",
 *     "job_title": "Software Engineer",
 *     "location": "Bangalore",
 *     "salary": 120000.0,
 *     "application_date": "2026-06-25",
 *     "status": "Interview",
 *     "job_url": "https://google.com/jobs",
 *     "notes": "FastAPI rules!"
 *   }
 * ]
 */
async function getApplications() {
    const url = `${API_BASE_URL}/applications`;
    
    inspectRequest('GET', url, null);
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${userToken}`
        }
    });
    
    // Check if unauthorized (token expired/invalid)
    if (response.status === 401) {
        logoutUser();
        throw new Error('Your session expired. Please log in again.');
    }
    
    const data = await response.json();
    inspectResponse(response.status, response.statusText, data);
    
    if (!response.ok) {
        throw new Error(data.detail || 'Failed to load applications');
    }
    
    return data;
}

/**
 * TODO: Implement this endpoint in FastAPI!
 * 
 * HTTP Endpoint: POST /applications
 * Description: Inserts a new application record into PostgreSQL.
 * 
 * Required Headers: Authorization: Bearer <JWT_TOKEN>
 * 
 * Expected Request Payload (JSON):
 * {
 *   "company_name": "Google",
 *   "job_title": "Software Engineer",
 *   "location": "Bangalore",
 *   "salary": 120000.0,
 *   "application_date": "2026-06-25",
 *   "status": "Interview",
 *   "job_url": "https://google.com/jobs",
 *   "notes": "FastAPI rules!"
 * }
 * 
 * Expected FastAPI Response (JSON): The newly created application object including PostgreSQL serial ID.
 */
async function createApplication(appData) {
    const url = `${API_BASE_URL}/applications`;
    
    inspectRequest('POST', url, appData);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(appData)
    });
    
    const data = await response.json();
    inspectResponse(response.status, response.statusText, data);
    
    if (!response.ok) {
        throw new Error(data.detail || 'Failed to save application');
    }
    
    return data;
}

/**
 * TODO: Implement this endpoint in FastAPI!
 * 
 * HTTP Endpoint: PUT /applications/{id}
 * Description: Updates an existing job application record in PostgreSQL.
 * 
 * Required Headers: Authorization: Bearer <JWT_TOKEN>
 * 
 * Expected Request Payload (JSON): Same fields as create (updated values).
 * Expected FastAPI Response (JSON): The updated application object.
 */
async function updateApplication(id, appData) {
    const url = `${API_BASE_URL}/applications/${id}`;
    
    inspectRequest('PUT', url, appData);
    
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(appData)
    });
    
    const data = await response.json();
    inspectResponse(response.status, response.statusText, data);
    
    if (!response.ok) {
        throw new Error(data.detail || 'Failed to update application');
    }
    
    return data;
}

/**
 * TODO: Implement this endpoint in FastAPI!
 * 
 * HTTP Endpoint: DELETE /applications/{id}
 * Description: Removes the job application record from PostgreSQL.
 * 
 * Required Headers: Authorization: Bearer <JWT_TOKEN>
 * 
 * Expected FastAPI Response (JSON or 204 No Content):
 * {
 *   "message": "Deleted successfully"
 * }
 */
async function deleteApplication(id) {
    const url = `${API_BASE_URL}/applications/${id}`;
    
    inspectRequest('DELETE', url, null);
    
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${userToken}`
        }
    });
    
    let data = null;
    if (response.status !== 204) {
        data = await response.json().catch(() => null);
    }
    
    inspectResponse(response.status, response.statusText, data);
    
    if (!response.ok) {
        throw new Error(data ? (data.detail || 'Failed to delete application') : 'Delete failed');
    }
    
    return data;
}

// ==========================================================================
// 🖥️ UI CONTROLLER, VIEWS & DOM RENDERERS
// ==========================================================================

/**
 * Switches the visual screen depending on authentication state.
 */
function applyAuthUI() {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    
    if (userToken) {
        authSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        document.getElementById('display-user-email').textContent = userEmail;
    } else {
        authSection.classList.remove('hidden');
        appSection.classList.add('hidden');
    }
}

/**
 * Logs out the user by clearing variables and changing the screen back to login.
 */
function logoutUser() {
    userToken = null;
    userEmail = null;
    sessionStorage.removeItem('dev_token');
    sessionStorage.removeItem('dev_email');
    applicationsList = [];
    applyAuthUI();
    showToast('Signed out of developer console.');
}

/**
 * Changes page view tabs (Dashboard, Applications).
 */
function switchTab(viewName) {
    document.querySelectorAll('.view-panel').forEach(panel => {
        if (panel.id === `${viewName}-view`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.id === `nav-btn-${viewName}`) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Change titles
    document.getElementById('page-title').textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
    
    // Refresh content for selected view
    if (viewName === 'dashboard') {
        refreshDashboardData();
    } else if (viewName === 'applications') {
        refreshApplicationsTable();
    }
}

/**
 * Periodically checks connection to backend FastAPI.
 */
async function checkBackendConnection() {
    const statusBadge = document.getElementById('connection-status');
    const dot = statusBadge.querySelector('.dot');
    const label = statusBadge.querySelector('.label');
    
    try {
        // Send a fast lightweight fetch to backend root or health route
        const res = await fetch(`${API_BASE_URL}/health`);
        if (res.ok) {
            statusBadge.className = 'status-badge connected';
            label.textContent = 'Connected';
        } else {
            statusBadge.className = 'status-badge offline';
            label.textContent = 'Backend Error';
        }
    } catch (e) {
        statusBadge.className = 'status-badge offline';
        label.textContent = 'Backend Offline';
    }
}

/**
 * Queries all jobs from backend and populates the dashboard counts.
 */
async function refreshDashboardData() {
    if (!userToken) return;
    
    try {
        const apps = await getApplications();
        applicationsList = apps;
        
        // Calculate counts
        const stats = {
            total: apps.length,
            applied: apps.filter(a => a.status === 'Applied').length,
            interview: apps.filter(a => a.status === 'Interview').length,
            rejected: apps.filter(a => a.status === 'Rejected').length,
            offer: apps.filter(a => a.status === 'Offer').length
        };
        
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-applied').textContent = stats.applied;
        document.getElementById('stat-interview').textContent = stats.interview;
        document.getElementById('stat-rejected').textContent = stats.rejected;
        document.getElementById('stat-offer').textContent = stats.offer;
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Queries all jobs from backend and renders them to the table.
 */
async function refreshApplicationsTable() {
    if (!userToken) return;
    
    const tableBody = document.getElementById('applications-table-body');
    const placeholder = document.getElementById('table-placeholder');
    tableBody.innerHTML = '';
    
    try {
        const apps = await getApplications();
        applicationsList = apps;
        
        // Local Filter criteria from inputs
        const searchQuery = document.getElementById('search-input').value.toLowerCase();
        const filterStatus = document.getElementById('filter-status').value;
        
        const filtered = apps.filter(app => {
            const matchesQuery = app.company_name.toLowerCase().includes(searchQuery) ||
                                 app.job_title.toLowerCase().includes(searchQuery);
            const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
            return matchesQuery && matchesStatus;
        });
        
        if (filtered.length === 0) {
            placeholder.classList.remove('hidden');
            placeholder.textContent = 'No matching records in database.';
            return;
        }
        
        placeholder.classList.add('hidden');
        
        filtered.forEach(app => {
            const tr = document.createElement('tr');
            
            // Format elements safely
            const badgeClass = `badge badge-${app.status.toLowerCase()}`;
            const salaryText = app.salary ? `$${Number(app.salary).toLocaleString()}` : '—';
            const urlText = app.job_url ? `<a href="${app.job_url}" target="_blank">Link</a>` : '—';
            
            tr.innerHTML = `
                <td><strong>${escapeHTML(app.company_name)}</strong></td>
                <td>${escapeHTML(app.job_title)}</td>
                <td>${escapeHTML(app.location)}</td>
                <td>${escapeHTML(app.application_date)}</td>
                <td>${salaryText}</td>
                <td><span class="${badgeClass}">${app.status}</span></td>
                <td class="actions-col">
                    <div class="inline-actions">
                        <button class="btn btn-secondary btn-sm edit-btn" data-id="${app.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${app.id}">Delete</button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(tr);
        });
        
        // Attach event listeners to newly generated row buttons
        tableBody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                openEditModal(id);
            });
        });
        
        tableBody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                openDeleteModal(id);
            });
        });
        
    } catch (error) {
        placeholder.classList.remove('hidden');
        placeholder.textContent = `API Error: ${error.message}`;
        showToast(error.message, 'error');
    }
}

// ==========================================================================
// 🗳️ MODAL ACTIONS & EVENT REGISTER
// ==========================================================================

let activeDeleteId = null;

function openAddModal() {
    const modal = document.getElementById('application-modal');
    document.getElementById('application-form').reset();
    document.getElementById('form-app-id').value = '';
    document.getElementById('modal-title').textContent = 'New Application';
    
    // Set default date to today
    document.getElementById('form-date').value = new Date().toISOString().split('T')[0];
    modal.classList.remove('hidden');
}

function openEditModal(id) {
    const modal = document.getElementById('application-modal');
    const app = applicationsList.find(a => a.id === id);
    if (!app) return;
    
    document.getElementById('form-app-id').value = app.id;
    document.getElementById('form-company').value = app.company_name;
    document.getElementById('form-title').value = app.job_title;
    document.getElementById('form-location').value = app.location;
    document.getElementById('form-salary').value = app.salary || '';
    document.getElementById('form-date').value = app.application_date;
    document.getElementById('form-status').value = app.status;
    document.getElementById('form-url').value = app.job_url || '';
    document.getElementById('form-notes').value = app.notes || '';
    
    document.getElementById('modal-title').textContent = 'Edit Application';
    modal.classList.remove('hidden');
}

function openDeleteModal(id) {
    const app = applicationsList.find(a => a.id === id);
    if (!app) return;
    
    activeDeleteId = id;
    document.getElementById('delete-target-company').textContent = app.company_name;
    document.getElementById('delete-target-title').textContent = app.job_title;
    document.getElementById('delete-modal').classList.remove('hidden');
}

function closeModals() {
    document.getElementById('application-modal').classList.add('hidden');
    document.getElementById('delete-modal').classList.add('hidden');
    activeDeleteId = null;
}

// ==========================================================================
// 💡 THEME TOGGLE CONTROLLER
// ==========================================================================

function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    
    const sun = document.querySelector('.sun-icon');
    const moon = document.querySelector('.moon-icon');
    
    if (saved === 'light') {
        sun.classList.remove('hidden');
        moon.classList.add('hidden');
    } else {
        sun.classList.add('hidden');
        moon.classList.remove('hidden');
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    
    const sun = document.querySelector('.sun-icon');
    const moon = document.querySelector('.moon-icon');
    
    if (next === 'light') {
        sun.classList.remove('hidden');
        moon.classList.add('hidden');
    } else {
        sun.classList.add('hidden');
        moon.classList.remove('hidden');
    }
}

// ==========================================================================
// 🚪 RUN INITIALIZATION AND REGISTRATION OF DOM EVENTS
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Core visual starts
    initTheme();
    applyAuthUI();
    checkBackendConnection();
    
    // Poll backend connection status every 5 seconds
    setInterval(checkBackendConnection, 5000);
    
    // 2. Base View Redirects on logged in state
    if (userToken) {
        switchTab('dashboard');
    }
    
    // 3. Bind Header settings changes in API Inspector
    document.getElementById('api-config-url').addEventListener('input', (e) => {
        API_BASE_URL = e.target.value.trim();
        checkBackendConnection();
    });
    
    document.getElementById('test-api-btn').addEventListener('click', testHealth);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // 4. Auth Navigation Links
    document.getElementById('link-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-card').classList.add('hidden');
        document.getElementById('register-card').classList.remove('hidden');
    });
    
    document.getElementById('link-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-card').classList.remove('hidden');
        document.getElementById('register-card').classList.add('hidden');
    });

    // ==========================================================================
    // FORM EVENT LISTENERS
    // ==========================================================================

    // Login Submission
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        try {
            await loginUser(email, password);
            showToast('Signed in successfully!');
            applyAuthUI();
            switchTab('dashboard');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Register Submission
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        
        try {
            await registerUser(username, email, password);
            showToast('Account created! Logging in...');
            
            // Auto login after registration
            await loginUser(email, password);
            applyAuthUI();
            switchTab('dashboard');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logoutUser);

    // Sidebar navigation tabs
    document.getElementById('nav-btn-dashboard').addEventListener('click', () => switchTab('dashboard'));
    document.getElementById('nav-btn-applications').addEventListener('click', () => switchTab('applications'));
    
    // Table Actions
    document.getElementById('refresh-dashboard-btn').addEventListener('click', refreshDashboardData);
    document.getElementById('search-input').addEventListener('input', refreshApplicationsTable);
    document.getElementById('filter-status').addEventListener('change', refreshApplicationsTable);
    
    // ==========================================================================
    // CRUD MODAL EVENT LISTENERS
    // ==========================================================================
    
    document.getElementById('open-add-modal-btn').addEventListener('click', openAddModal);
    
    // Close Triggers
    document.getElementById('close-modal-btn').addEventListener('click', closeModals);
    document.getElementById('cancel-form-btn').addEventListener('click', closeModals);
    document.getElementById('close-delete-modal-btn').addEventListener('click', closeModals);
    document.getElementById('cancel-delete-btn').addEventListener('click', closeModals);

    // Save Application Form (Submit)
    document.getElementById('application-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('form-app-id').value;
        const appPayload = {
            company_name: document.getElementById('form-company').value.trim(),
            job_title: document.getElementById('form-title').value.trim(),
            location: document.getElementById('form-location').value.trim(),
            salary: document.getElementById('form-salary').value ? parseFloat(document.getElementById('form-salary').value) : null,
            application_date: document.getElementById('form-date').value,
            status: document.getElementById('form-status').value,
            job_url: document.getElementById('form-url').value.trim() || null,
            notes: document.getElementById('form-notes').value.trim() || null
        };

        try {
            if (id) {
                // Update PUT
                await updateApplication(parseInt(id), appPayload);
                showToast('Application updated!');
            } else {
                // Create POST
                await createApplication(appPayload);
                showToast('Application saved!');
            }
            closeModals();
            refreshApplicationsTable();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Delete Confirmation button
    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        if (!activeDeleteId) return;
        
        try {
            await deleteApplication(activeDeleteId);
            showToast('Application deleted.');
            closeModals();
            refreshApplicationsTable();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
});

// ==========================================================================
// 🛠️ UTILITY HELPERS
// ==========================================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    // Subtle type styles
    if (type === 'error') {
        toast.style.borderLeft = '4px solid var(--status-rejected)';
    } else {
        toast.style.borderLeft = '4px solid var(--accent)';
    }
    
    toast.textContent = message;
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'opacity 0.2s, transform 0.2s';
        setTimeout(() => toast.remove(), 200);
    }, 3000);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
