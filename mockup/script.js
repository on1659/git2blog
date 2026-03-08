// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');

    // Reset steps when going to write page
    if (pageId === 'write') {
        showStep('mode-select');
    }
}

// Step Navigation
function showStep(stepId) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    const step = document.getElementById(stepId);
    if (step) step.classList.add('active');
}

// Mode Selection
function selectMode(mode) {
    if (mode === 'auto') {
        showStep('step-auto');
    } else if (mode === 'upload') {
        showStep('step-upload');
        setupUpload();
    }
}

// Upload Setup
function setupUpload() {
    const box = document.getElementById('upload-box');
    const input = document.getElementById('file-input');

    box.onclick = () => input.click();

    box.ondragover = (e) => {
        e.preventDefault();
        box.style.borderColor = 'var(--primary)';
    };

    box.ondragleave = () => {
        box.style.borderColor = 'var(--border)';
    };

    box.ondrop = (e) => {
        e.preventDefault();
        box.style.borderColor = 'var(--border)';
        handleFiles(e.dataTransfer.files);
    };

    input.onchange = () => handleFiles(input.files);
}

let uploadedFiles = [];

function handleFiles(files) {
    const list = document.getElementById('file-list');
    const btn = document.getElementById('upload-btn');

    for (const file of files) {
        if (file.name.endsWith('.md')) {
            uploadedFiles.push(file);
        }
    }

    list.innerHTML = uploadedFiles.map((f, i) => `
        <div class="file-item">
            <span>📄 ${f.name}</span>
            <button onclick="removeFile(${i})" style="background:none;border:none;color:#737373;cursor:pointer">✕</button>
        </div>
    `).join('');

    btn.style.display = uploadedFiles.length > 0 ? 'block' : 'none';
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    handleFiles([]);
}

function uploadFiles() {
    showStep('step-loading');
    setTimeout(() => {
        showPage('edit');
        showToast('파일 업로드 완료');
    }, 1500);
}

// Generate Post
function generatePost() {
    showStep('step-loading');
    setTimeout(() => {
        showPage('edit');
        showToast('포스트 생성 완료');
    }, 2000);
}

// Modal
function showModal() {
    document.getElementById('modal').classList.add('active');
}

function closeModal(e) {
    if (!e || e.target === e.currentTarget) {
        document.getElementById('modal').classList.remove('active');
    }
}

function publish() {
    closeModal();
    showToast('발행 완료!');
}

// Toast
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    };
});

// Suggestion selection
document.querySelectorAll('.suggestion-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.suggestion-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
    };
});