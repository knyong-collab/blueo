// 全局变量
let uploadedImages = [];
let currentProject = null;
let projects = [];

// 数据库路径
const DB_PATH = 'database/projects.json';
const IMAGES_PATH = 'database/images/';

// SQLite数据库
let db = null;

// 登录用户信息
const DEFAULT_USERS = {
    'BLUEO': 'BLUEO123123',
    'guest': 'guest123'
};

// 检查是否已登录
function checkLoginStatus() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    return isLoggedIn === 'true';
}

// 登录验证
function login(username, password) {
    if (DEFAULT_USERS[username] && DEFAULT_USERS[username] === password) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('currentUser', username);
        return true;
    }
    return false;
}

// 退出登录
function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('currentUser');
    showLoginScreen();
}

// 初始化SQLite数据库
async function initSQLite() {
    try {
        // 加载SQLite WASM文件
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
        });
        
        // 创建内存数据库
        db = new SQL.Database();
        
        // 创建项目表
        db.run(`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                status TEXT,
                progress INTEGER,
                priority TEXT,
                category TEXT,
                startDate TEXT,
                launchDate TEXT,
                currentStage TEXT,
                manager TEXT,
                team TEXT,
                budget TEXT,
                images TEXT,
                remarks TEXT,
                history TEXT,
                createdAt TEXT,
                updatedAt TEXT
            );
        `);
        
        console.log('SQLite数据库初始化成功');
    } catch (error) {
        console.error('SQLite初始化失败:', error);
    }
}

// 显示登录界面
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

// 显示主应用界面
function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
}

// 保存项目到SQLite
async function saveToSQLite(projects) {
    if (!db) {
        console.warn('SQLite未初始化，跳过保存');
        return;
    }
    
    try {
        // 开启事务
        db.run('BEGIN TRANSACTION');
        
        // 清空表
        db.run('DELETE FROM projects');
        
        // 插入项目数据
        const stmt = db.prepare(`
            INSERT INTO projects (
                id, name, description, status, progress, priority, category, 
                startDate, launchDate, currentStage, manager, team, budget, 
                images, remarks, history, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const project of projects) {
            stmt.run(
                project.id,
                project.name,
                project.description,
                project.status,
                project.progress,
                project.priority,
                project.category,
                project.startDate,
                project.launchDate,
                project.currentStage,
                project.manager,
                project.team,
                project.budget,
                JSON.stringify(project.images || []),
                JSON.stringify(project.remarks || []),
                JSON.stringify(project.history || []),
                project.createdAt,
                project.updatedAt
            );
        }
        
        stmt.finalize();
        db.run('COMMIT');
        
        console.log('数据保存到SQLite成功');
    } catch (error) {
        console.error('保存到SQLite失败:', error);
        // 回滚事务
        db.run('ROLLBACK');
    }
}

// 从SQLite加载项目
async function loadFromSQLite() {
    if (!db) {
        console.warn('SQLite未初始化，跳过加载');
        return [];
    }
    
    try {
        const projects = [];
        const stmt = db.prepare('SELECT * FROM projects');
        
        while (stmt.step()) {
            const row = stmt.getAsObject();
            // 解析JSON字段
            row.images = JSON.parse(row.images || '[]');
            row.remarks = JSON.parse(row.remarks || '[]');
            row.history = JSON.parse(row.history || '[]');
            projects.push(row);
        }
        
        stmt.finalize();
        console.log('从SQLite加载项目成功');
        return projects;
    } catch (error) {
        console.error('从SQLite加载失败:', error);
        return [];
    }
}

// 确保目录存在
function ensureDirectoriesExist() {
    // 在浏览器环境中，我们无法直接操作文件系统
    // 但我们可以在导出数据时确保目录结构
    console.log('确保目录存在');
}

// 保存项目数据到文件系统
function saveProjectsToFileSystem(projects) {
    try {
        // 创建导出数据对象
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            projects: projects
        };
        
        // 将数据转换为JSON字符串
        const jsonString = JSON.stringify(exportData, null, 2);
        
        // 创建Blob对象
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = 'projects.json';
        link.href = URL.createObjectURL(blob);
        link.click();
        
        // 释放URL对象
        setTimeout(() => {
            URL.revokeObjectURL(link.href);
        }, 100);
        
        console.log('项目数据已导出到文件系统');
    } catch (error) {
        console.error('保存到文件系统失败:', error);
    }
}

// 从文件系统加载项目数据
function loadProjectsFromFileSystem(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (!importData.projects || !Array.isArray(importData.projects)) {
                    throw new Error('无效的项目数据格式');
                }
                
                resolve(importData.projects);
            } catch (error) {
                console.error('读取文件失败:', error);
                reject(error);
            }
        };
        reader.onerror = function() {
            reject(new Error('读取文件失败'));
        };
        reader.readAsText(file);
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化SQLite数据库
    await initSQLite();
    
    // 检查登录状态
    if (checkLoginStatus()) {
        showMainApp();
        initializeApp();
    } else {
        showLoginScreen();
    }

    // 初始化登录表单
    initializeLoginForm();

    // 检查数据备份状态
    checkBackupStatus();
});

// 检查数据备份状态
function checkBackupStatus() {
    const lastExport = localStorage.getItem('lastExport');
    const today = new Date();
    
    if (!lastExport) {
        // 首次使用，提醒用户
        setTimeout(() => {
            if (confirm('欢迎使用蓝橙产品开发项目管理系统！\n\n为了确保数据安全，建议您定期导出项目数据。\n\n是否现在导出数据？')) {
                exportProjectData();
            }
        }, 3000);
    } else {
        // 检查是否超过7天未导出
        const lastExportDate = new Date(lastExport);
        const daysSinceExport = (today - lastExportDate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceExport >= 7) {
            setTimeout(() => {
                if (confirm('您已超过7天未导出项目数据。\n\n为了确保数据安全，建议定期导出数据备份。\n\n是否现在导出数据？')) {
                    exportProjectData();
                }
            }, 3000);
        }
    }
}

// 更新最后导出时间
function updateLastExportTime() {
    localStorage.setItem('lastExport', new Date().toISOString());
}

// 初始化登录表单
function initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (login(username, password)) {
            showMainApp();
            initializeApp();
        } else {
            alert('用户名或密码错误！');
        }
    });
}

// 初始化应用
async function initializeApp() {
    initializeImageUpload();
    initializeForm();
    initializeStatusProgress();
    initializeEventListeners();
    
    // 添加退出登录按钮事件
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    await loadProjects();
}

// 初始化图片上传功能
function initializeImageUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const imageUploadSection = document.querySelector('.image-upload-section');

    // 拖拽事件 - 扩大到整个产品图片模块
    imageUploadSection.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    imageUploadSection.addEventListener('dragleave', function() {
        dropZone.classList.remove('dragover');
    });

    imageUploadSection.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // 点击上传
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    // 粘贴上传
    document.addEventListener('paste', function(e) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                handleFiles([file]);
                break;
            }
        }
    });

    // 处理文件
    function handleFiles(files) {
        // 限制最多上传3张图片
        if (uploadedImages.length >= 3) {
            alert('最多只能上传3张图片');
            return;
        }
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.indexOf('image') !== -1) {
                // 限制文件大小为10MB
                if (file.size > 10 * 1024 * 1024) {
                    alert('图片大小不能超过10MB');
                    continue;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    // 压缩图片
                    compressImage(e.target.result, function(compressedImageUrl) {
                        uploadedImages.push(compressedImageUrl);
                        updateImagePreview();
                    });
                };
                reader.readAsDataURL(file);
            }
        }
    }

    // 更新图片预览
    function updateImagePreview() {
        imagePreview.innerHTML = '';
        uploadedImages.forEach((imageUrl, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.innerHTML = `
                <img src="${imageUrl}" alt="产品图片">
                <button class="remove-btn" data-index="${index}">×</button>
            `;
            imagePreview.appendChild(previewItem);
        });

        // 添加删除按钮事件
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                uploadedImages.splice(index, 1);
                updateImagePreview();
            });
        });
    }
    
    // 压缩图片函数
    function compressImage(imageDataUrl, callback) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // 设置压缩后的图片宽度和高度
            // 保持原始宽高比，最大宽度为800px
            const maxWidth = 800;
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制压缩后的图片
            ctx.drawImage(img, 0, 0, width, height);
            
            // 将压缩后的图片转换为dataURL
            // 质量参数设为0.7，平衡图片质量和文件大小
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            callback(compressedDataUrl);
        };
        
        img.src = imageDataUrl;
    }
}

// 初始化表单
function initializeForm() {
    const projectForm = document.getElementById('projectForm');
    
    // 表单提交事件
    projectForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveProject();
    });
}

// 初始化状态和进度控制
function initializeStatusProgress() {
    const statusButtons = document.querySelectorAll('.status-btn');
    const statusText = document.getElementById('statusText');
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    const customStatusInput = document.getElementById('customStatus');
    const setCustomStatusBtn = document.getElementById('setCustomStatus');

    // 状态按钮点击事件
    statusButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const status = this.getAttribute('data-status');
            statusText.textContent = status;
            statusText.className = status;
            
            // 更新按钮状态
            statusButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 根据状态更新进度条
            const statusIndex = Array.from(statusButtons).indexOf(this);
            if (statusIndex >= 0 && statusIndex < 12) { // 12个状态按钮
                const progress = ((statusIndex + 1) / 12) * 100;
                progressFill.style.width = `${progress}%`;
                progressPercentage.textContent = `${Math.round(progress)}%`;
            }
        });
    });

    // 自定义状态设置
    setCustomStatusBtn.addEventListener('click', function() {
        const customStatus = customStatusInput.value.trim();
        if (customStatus) {
            statusText.textContent = customStatus;
            statusText.className = '';
            
            // 重置状态按钮
            statusButtons.forEach(b => b.classList.remove('active'));
            
            // 清空输入框
            customStatusInput.value = '';
        }
    });

    // 按Enter键设置自定义状态
    customStatusInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            setCustomStatusBtn.click();
        }
    });
}

// 初始化模态框
function initializeModal() {
    const shareModal = document.getElementById('shareModal');
    const shareBtn = document.getElementById('shareBtn');
    const closeBtn = document.querySelector('.close');
    const copyLinkBtn = document.getElementById('copyLink');
    const shareUrl = document.getElementById('shareUrl');

    shareBtn.addEventListener('click', function() {
        shareModal.style.display = 'block';
        // 生成分享链接
        shareUrl.value = window.location.href;
    });

    closeBtn.addEventListener('click', function() {
        shareModal.style.display = 'none';
    });

    copyLinkBtn.addEventListener('click', function() {
        shareUrl.select();
        document.execCommand('copy');
        alert('链接已复制到剪贴板');
    });

    // 点击模态框外部关闭
    window.addEventListener('click', function(e) {
        if (e.target === shareModal) {
            shareModal.style.display = 'none';
        }
    });
}

// 初始化事件监听器
function initializeEventListeners() {
    // 保存项目按钮
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
            console.log('保存按钮被点击');
            await saveProject();
        });
    } else {
        console.error('保存按钮未找到');
    }
    
    // 导出HTML按钮
    const exportHtmlBtn = document.getElementById('exportHtmlBtn');
    if (exportHtmlBtn) {
        exportHtmlBtn.addEventListener('click', exportHTML);
    }
    
    // 导出图片按钮
    const exportImageBtn = document.getElementById('exportImageBtn');
    if (exportImageBtn) {
        exportImageBtn.addEventListener('click', exportImage);
    }
    
    // 微信分享按钮
    const wechatShare = document.getElementById('wechatShare');
    if (wechatShare) {
        wechatShare.addEventListener('click', function() {
            alert('请使用微信扫描二维码或分享链接');
        });
    }
    
    // 新增项目按钮
    const newProjectBtn = document.getElementById('newProjectBtn');
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', function() {
            // 清空表单
            document.getElementById('projectForm').reset();
            
            // 重置状态和进度
            document.getElementById('statusText').textContent = '未设置';
            document.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));
            
            // 重置进度条
            document.getElementById('progressFill').style.width = '0%';
            document.getElementById('progressPercentage').textContent = '0%';
            document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
            
            // 清空图片
            uploadedImages = [];
            updateImagePreview();
            
            // 重置项目ID
            currentProjectId = null;
            
            alert('已重置表单，开始填写新的项目');
        });
    }
    
    // 排序控件
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', function() {
            sortProjects(this.value);
        });
    }
    
    // 搜索功能
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterProjects(searchTerm);
        });
    }
    
    // 导出项目数据按钮
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', exportProjectData);
    }
    
    // 加载项目数据按钮
    const importDataBtn = document.getElementById('importDataBtn');
    if (importDataBtn) {
        importDataBtn.addEventListener('click', function() {
            document.getElementById('importFile').click();
        });
    }
    
    // 加载项目数据文件
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.addEventListener('change', importProjectData);
    }
}

// 初始化IndexedDB
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ProductDevelopmentDB', 1);
        
        request.onerror = () => reject('IndexedDB打开失败');
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('projects')) {
                db.createObjectStore('projects', { keyPath: 'id' });
            }
        };
        
        request.onsuccess = (event) => resolve(event.target.result);
    });
}

// 保存项目到IndexedDB
async function saveToIndexedDB(projects) {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        
        // 清空现有数据
        const clearRequest = store.clear();
        clearRequest.onerror = () => console.error('清空数据失败');
        
        // 保存所有项目
        for (const project of projects) {
            const putRequest = store.put(project);
            putRequest.onerror = (event) => {
                console.error('保存项目失败:', event.target.error);
                // 继续保存其他项目，不中断整个过程
            };
        }
        
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => {
                console.error('事务失败:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('保存到IndexedDB失败:', error);
        // 自动降级到localStorage
        try {
            localStorage.setItem('projects', JSON.stringify(projects));
            console.log('已自动降级到localStorage');
            return Promise.resolve(); // 降级成功，返回成功
        } catch (localError) {
            console.error('保存到localStorage也失败:', localError);
            throw error; // 都失败了，抛出原始错误
        }
    }
}

// 从IndexedDB加载项目
async function loadFromIndexedDB() {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('加载数据失败');
        });
    } catch (error) {
        console.error('从IndexedDB加载失败:', error);
        return [];
    }
}

// 保存项目
async function saveProject() {
    console.log('开始保存项目...');
    
    try {
        // 确保projects数组存在
        if (!Array.isArray(projects)) {
            projects = [];
            console.log('初始化projects数组');
        }
        const projectName = document.getElementById('projectName').value;
        const brand = document.getElementById('brand').value;
        const productCategory = document.getElementById('productCategory').value;
        const productType = document.getElementById('productType').value;
        const priority = document.getElementById('priority').value;
        const estimatedLaunchDate = document.getElementById('estimatedLaunchDate').value;
        const remarks = document.getElementById('remarks').value;
        const status = document.getElementById('statusText').textContent;
        const progress = document.getElementById('progressPercentage').textContent;

        console.log('表单数据获取成功');
        console.log('项目名称:', projectName);
        console.log('品牌:', brand);
        console.log('产品类别:', productCategory);
        console.log('产品类型:', productType);
        console.log('优先级:', priority);
        console.log('预计上市:', estimatedLaunchDate);

        if (!projectName || !productCategory || !productType || !priority) {
            console.log('必填字段未填写');
            alert('请填写必填字段');
            return;
        }

        // 构建项目数据
        const projectData = {
            id: currentEditProjectId || Date.now().toString(),
            name: projectName,
            brand: brand,
            category: productCategory,
            productType: productType,
            priority: priority,
            launchDate: estimatedLaunchDate,
            status: status,
            progress: progress,
            images: uploadedImages,
            createdAt: new Date().toISOString()
        };

        console.log('项目数据构建成功');

        // 处理备注
        if (remarks) {
            const newRemark = {
                text: remarks,
                timestamp: new Date().toISOString()
            };
            
            // 检查是否是更新现有项目
            const existingIndex = projects.findIndex(p => p.id === projectData.id);
            if (existingIndex >= 0) {
                // 保留原有备注并添加新备注
                projectData.remarks = [...(projects[existingIndex].remarks || []), newRemark];
            } else {
                // 新项目，创建备注数组
                projectData.remarks = [newRemark];
            }
            console.log('备注处理成功');
        } else {
            // 无新备注，保留原有备注
            const existingIndex = projects.findIndex(p => p.id === projectData.id);
            if (existingIndex >= 0) {
                projectData.remarks = projects[existingIndex].remarks || [];
            }
        }

        const project = projectData;

        // 检查是否是更新现有项目
        const existingIndex = projects.findIndex(p => p.id === project.id);
        
        // 记录历史
        const historyEntry = {
            timestamp: new Date().toISOString(),
            action: existingIndex >= 0 ? '更新' : '创建',
            changes: {
                name: project.name,
                brand: project.brand,
                category: project.category,
                productType: project.productType,
                priority: project.priority,
                status: project.status,
                progress: project.progress
            }
        };
        
        if (existingIndex >= 0) {
            // 更新现有项目
            project.history = [...(projects[existingIndex].history || []), historyEntry];
            // 不要覆盖备注，因为已经在前面处理过了
            // project.remarks = projects[existingIndex].remarks || [];
            projects[existingIndex] = project;
            console.log('项目更新成功');
        } else {
            // 新项目
            project.history = [historyEntry];
            // 备注信息已经在前面处理过了，不要清空
            projects.push(project);
            console.log('新项目添加成功');
        }

        // 保存到SQLite
        try {
            await saveToSQLite(projects);
            console.log('SQLite保存成功');
        } catch (dbError) {
            console.error('SQLite保存失败:', dbError);
            
            // 降级到localStorage
            try {
                // 优化图片数据，限制存储大小
                const optimizedProjects = projects.map(project => {
                    return {
                        ...project,
                        // 只保存第一张图片，并且限制大小
                        images: project.images ? project.images.slice(0, 1).map(img => {
                            // 对于大图片进行压缩
                            if (img.length > 100000) { // 超过100KB
                                // 暂时只保留第一张图片的前100KB，不添加'...'以保持DataURL有效性
                                return img.substring(0, 100000);
                            }
                            return img;
                        }) : []
                    };
                });
                
                const projectData = JSON.stringify(optimizedProjects);
                
                // 检查数据大小
                if (projectData.length > 500000) { // 超过500KB
                    alert('项目数据过大，部分图片可能被压缩');
                }
                
                localStorage.setItem('projects', projectData);
                console.log('本地存储保存成功');
            } catch (storageError) {
                console.error('本地存储保存失败:', storageError);
                
                // 尝试减少数据量
                try {
                    const minimalProjects = projects.map(project => {
                        return {
                            ...project,
                            images: [] // 完全移除图片数据
                        };
                    });
                    localStorage.setItem('projects', JSON.stringify(minimalProjects));
                    alert('保存成功，但图片数据已移除');
                } catch (e) {
                    alert('保存失败：存储错误，请减少项目数据');
                    return;
                }
            }
        }
        
        // 更新项目列表
        updateProjectList();
        console.log('项目列表更新成功');
        
        alert('项目保存成功');
        console.log('保存流程完成');
        
        // 重置当前编辑的项目ID，以便下次保存时能够正确创建新项目
        currentEditProjectId = null;
        
    } catch (error) {
        console.error('保存项目时出错:', error);
        alert('保存失败：' + error.message);
    }
}

// 自动导出数据到数据文件夹
function autoExportData() {
    if (projects.length === 0) {
        return;
    }
    
    // 创建导出数据对象
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        projects: projects
    };
    
    // 将数据转换为JSON字符串
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // 创建Blob对象
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // 创建下载链接
    const link = document.createElement('a');
    link.download = `项目数据_${new Date().toISOString().slice(0,10)}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    
    // 释放URL对象
    setTimeout(() => {
        URL.revokeObjectURL(link.href);
    }, 100);
    
    console.log('数据已导出，请将文件保存到「数据」文件夹');
    alert('数据已导出，请将文件保存到项目根目录的「数据」文件夹中，以便下次加载时使用。');
}



// 导出HTML文件
function exportHTML() {
    if (projects.length === 0) {
        alert('暂无项目数据可导出');
        return;
    }
    
    // 创建HTML模板
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>产品开发项目管理列表</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --primary-bg: #0a1128;
            --secondary-bg: #121c38;
            --card-bg: rgba(255, 255, 255, 0.1);
            --accent-color: #00d4ff;
            --text-primary: #ffffff;
            --text-secondary: #b0b8d4;
            --border-color: #2a395f;
            --success-color: #00ff9f;
            --warning-color: #ffaa00;
            --danger-color: #ff3d71;
            --progress-bg: #2a395f;
            --progress-fill: #00d4ff;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, var(--primary-bg) 0%, #1e3a8a 50%, #1d4ed8 100%);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 0;
            margin: 0;
            overflow-x: hidden;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            text-align: center;
            margin-bottom: 40px;
            padding: 40px 0;
        }
        
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(90deg, var(--accent-color), #7928ca);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 15px;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .export-time {
            font-size: 1rem;
            color: var(--text-secondary);
            margin-bottom: 30px;
            display: inline-block;
            padding: 8px 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 30px;
        }
        
        .project-card {
            background: var(--card-bg);
            border-radius: 18px;
            padding: 0;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        
        .project-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            border-color: rgba(255, 120, 0, 0.3);
        }
        
        .project-card-image {
            width: 100%;
            height: 0;
            padding-bottom: 80%;
            position: relative;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
        }
        
        .project-card-image img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 18px 18px 0 0;
        }
        
        .project-card-image div {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
            backdrop-filter: blur(10px);
        }
        
        .project-card-content {
            padding: 25px;
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        .project-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        .project-name {
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
            flex: 1;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .status-tag {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            backdrop-filter: blur(10px);
        }
        
        .status-tag.概念设计 {
            background: linear-gradient(135deg, #0070f3 0%, #0056b3 100%);
            color: white;
        }
        
        .status-tag.原型开发 {
            background: linear-gradient(135deg, #ff7800 0%, #cc6000 100%);
            color: white;
        }
        
        .status-tag.产品打样 {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
        }
        
        .status-tag.模具开发 {
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            color: white;
        }
        
        .status-tag.样品测试 {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
        }
        
        .status-tag.模具优化 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .status-tag.工艺参数优化 {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }
        
        .status-tag.丝印 / 外观细节调整 {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            color: white;
        }
        
        .status-tag.小批量试产 {
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            color: white;
        }
        
        .status-tag.批量生产 {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
        }
        
        .status-tag.上市筹备 {
            background: linear-gradient(135deg, #00c6fb 0%, #005bea 100%);
            color: white;
        }
        
        .status-tag.推广准备 {
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            color: white;
        }
        
        .status-tag.项目暂停 {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
        }
        
        .project-card-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
            padding: 12px 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .info-label {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            text-transform: uppercase;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
        }
        
        .info-value {
            font-size: 14px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
        }
        
        .priority-高 {
            color: #ff6b6b !important;
        }
        
        .priority-中 {
            color: #ffd93d !important;
        }
        
        .priority-低 {
            color: #6bcb77 !important;
        }
        
        .project-card-progress {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(255, 120, 0, 0.1);
            border-radius: 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 120, 0, 0.2);
        }
        
        .progress-ring-small {
            position: relative;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .progress-ring-small svg {
            transform: rotate(-90deg);
            position: absolute;
            top: 0;
            left: 0;
        }
        
        .progress-ring-circle-small {
            fill: none;
            stroke: #e0e0e0;
            stroke-width: 10;
            stroke-linejoin: round;
            stroke-miterlimit: 10;
        }
        
        .progress-ring-progress-small {
            fill: none;
            stroke: url(#progressGradient);
            stroke-width: 10;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-miterlimit: 10;
            transition: stroke-dasharray 1s ease-out;
        }
        
        @keyframes progressFill {
            from {
                stroke-dasharray: 0 ${2 * Math.PI * 30};
            }
            to {
                stroke-dasharray: var(--progress-value) ${2 * Math.PI * 30};
            }
        }
        
        .progress-details {
            flex: 1;
        }
        
        .progress-details p {
            margin: 6px 0;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
        }
        
        .project-card-remarks {
            margin-top: auto;
            padding: 15px;
            background: rgba(255, 120, 0, 0.1);
            border-radius: 10px;
            border-left: 4px solid #0070f3;
            backdrop-filter: blur(10px);
        }
        
        .project-card-remarks p {
            margin: 8px 0;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
        }
        
        .remark-time {
            color: rgba(255, 255, 255, 0.6) !important;
            font-size: 12px !important;
            font-style: italic;
        }
        
        /* 响应式设计 */
        @media (max-width: 1200px) {
            .container {
                padding: 15px;
            }
            
            .projects-grid {
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 25px;
            }
            
            .project-card-content {
                padding: 20px;
            }
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            header {
                padding: 30px 0;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            .projects-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .project-card-content {
                padding: 20px;
            }
            
            .project-card-info {
                grid-template-columns: 1fr;
            }
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 10px;
            }
            
            h1 {
                font-size: 1.75rem;
            }
            
            .project-card-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .status-tag {
                align-self: flex-start;
            }
            
            .project-card-content {
                padding: 15px;
            }
            
            .project-name {
                font-size: 18px;
            }
        }
        
        /* 渐变定义 */
        defs {
            linearGradient#gradientSmall {
                stop {
                    offset: 0%;
                    stop-color: #667eea;
                }
                stop {
                    offset: 100%;
                    stop-color: #764ba2;
                }
            }
        }
        
        /* 加载动画 */
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: var(--accent-color);
            animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* 排序控件样式 */
        .sort-control {
            margin-top: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .sort-control label {
            font-size: 1rem;
            color: var(--text-secondary);
        }
        
        .sort-select {
            padding: 8px 16px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .sort-select:hover {
            border-color: var(--accent-color);
            box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
        }
        
        .sort-select option {
            background: var(--primary-bg);
            color: var(--text-primary);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>蓝橙产品开发项目列表</h1>
            <p class="export-time">导出时间: ${new Date().toLocaleString()}</p>
            <div class="sort-control">
                <label for="sortSelect">排序方式:</label>
                <select id="sortSelect" class="sort-select">
                    <option value="launchDate">默认（按上市时间）</option>
                    <option value="priority">按优先级</option>
                    <option value="progress">按进度</option>
                </select>
            </div>
        </header>
        
        <div id="projectsContainer" class="projects-grid">
            ${projects.map((project, index) => `
                <div class="project-card" data-priority="${project.priority}" data-progress="${project.progress.replace('%', '')}" ${project.launchDate ? `data-launch-date="${project.launchDate}"` : ''} style="opacity: 0; transform: translateY(30px); transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div class="project-card-image">
                        ${project.images && project.images.length > 0 ? `
                            <img src="${project.images[0]}" alt="${project.name}">
                        ` : `
                            <div>暂无图片</div>
                        `}
                    </div>
                    <div class="project-card-content">
                        <div class="project-card-header">
                            <h2 class="project-name">${index + 1}. ${project.name}</h2>
                            <span class="status-tag ${project.status}">
                                ${project.status}
                            </span>
                        </div>
                        <div class="project-card-info">
                            <div class="info-item">
                                <div class="info-label">品牌</div>
                                <div class="info-value">${project.brand || '未设置'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">类别</div>
                                <div class="info-value">${project.category}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">类型</div>
                                <div class="info-value">${project.productType}</div>
                            </div>
                            <div class="info-item" ${project.launchDate ? `data-launch-date="${project.launchDate}"` : ''}>
                                <div class="info-label">优先级</div>
                                <div class="info-value priority-${project.priority}">${project.priority}</div>
                            </div>
                        </div>
                        <div class="project-card-progress">
                            <div class="progress-ring-small">
                                <svg width="80" height="80">
                                    <defs>
                                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stop-color="#9c27b0"/>
                                            <stop offset="100%" stop-color="#1e88e5"/>
                                        </linearGradient>
                                    </defs>
                                    <circle class="progress-ring-circle-small" cx="40" cy="40" r="30"></circle>
                                    <circle class="progress-ring-progress-small" cx="40" cy="40" r="30" style="stroke-dasharray: ${2 * Math.PI * 30 * parseInt(project.progress) / 100} ${2 * Math.PI * 30}"></circle>
                                </svg>
                                <div style="text-align: center;">
                                    <div style="font-size: 16px; font-weight: 600; color: white;">${project.progress}</div>
                                </div>
                            </div>
                            <div class="progress-details">
                                <p>当前阶段: ${(() => {
                                    const progressValue = parseInt(project.progress);
                                    // 12个进度步骤，每个步骤对应约8.33%的进度
                                    const steps = [
                                        { name: '概念设计', min: 0, max: 8.33 },
                                        { name: '原型开发', min: 8.33, max: 16.66 },
                                        { name: '产品打样', min: 16.66, max: 25 },
                                        { name: '模具开发', min: 25, max: 33.33 },
                                        { name: '样品测试', min: 33.33, max: 41.66 },
                                        { name: '模具优化', min: 41.66, max: 50 },
                                        { name: '工艺参数优化', min: 50, max: 58.33 },
                                        { name: '丝印 / 外观细节调整', min: 58.33, max: 66.66 },
                                        { name: '小批量试产', min: 66.66, max: 75 },
                                        { name: '批量生产', min: 75, max: 83.33 },
                                        { name: '上市筹备', min: 83.33, max: 91.66 },
                                        { name: '推广准备', min: 91.66, max: 100 }
                                    ];
                                    
                                    // 查找当前进度对应的步骤
                                    const currentStep = steps.find(step => progressValue >= step.min && progressValue < step.max) || steps[steps.length - 1];
                                    return currentStep.name;
                                })()}</p>
                                <p ${project.launchDate ? `data-launch-date="${project.launchDate}"` : ''}>上市日期: ${project.launchDate || '未设置'}</p>
                            </div>
                        </div>
                        ${project.remarks && project.remarks.length > 0 ? `
                        <div class="project-card-remarks">
                            <p class="remark-time">${new Date(project.remarks[project.remarks.length - 1].timestamp).toLocaleString()}</p>
                            <p>${project.remarks[project.remarks.length - 1].text}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    
    <script>
        // 添加页面加载动画效果
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.project-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
            });
            
            // 排序功能
            const sortSelect = document.getElementById('sortSelect');
            const projectsContainer = document.getElementById('projectsContainer');
            
            // 排序函数
            function sortProjects(sortBy) {
                // 获取当前所有卡片
                const projectCards = Array.from(document.querySelectorAll('.project-card'));
                let sortedCards = [...projectCards];
                
                switch(sortBy) {
                    case 'launchDate':
                        // 按上市日期排序，时间越靠前的排在前面
                        sortedCards.sort((a, b) => {
                            const dateA = a.dataset.launchDate || '';
                            const dateB = b.dataset.launchDate || '';
                            // 空日期排在最后
                            if (!dateA && !dateB) return 0;
                            if (!dateA) return 1;
                            if (!dateB) return -1;
                            // 时间越靠前的排在前面
                            return new Date(dateA) - new Date(dateB);
                        });
                        break;
                    case 'priority':
                        // 按优先级排序，高优先级排在前面
                        const priorityOrder = { '高': 3, '中': 2, '低': 1 };
                        sortedCards.sort((a, b) => {
                            const priorityA = a.dataset.priority || '低';
                            const priorityB = b.dataset.priority || '低';
                            // 优先级高的排前面
                            return priorityOrder[priorityB] - priorityOrder[priorityA];
                        });
                        break;
                    case 'progress':
                        // 按进度排序，进度数字大的排前面
                        sortedCards.sort((a, b) => {
                            const progressA = parseInt(a.dataset.progress || '0');
                            const progressB = parseInt(b.dataset.progress || '0');
                            // 进度数字大的排前面
                            return progressB - progressA;
                        });
                        break;
                    default:
                        // 默认排序（保持原有顺序）
                        break;
                }
                
                // 清空容器并重新添加排序后的卡片
                projectsContainer.innerHTML = '';
                sortedCards.forEach(card => {
                    projectsContainer.appendChild(card);
                });
            }
            
            // 页面加载完成后默认按上市时间排序
            sortProjects('launchDate');
            
            // 排序选择事件
            sortSelect.addEventListener('change', function() {
                const sortBy = this.value;
                sortProjects(sortBy);
            });
        });
    </script>
</body>
</html>
    `;
    
    // 创建Blob对象
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    // 创建下载链接
    const link = document.createElement('a');
    link.download = `项目列表_${new Date().toISOString().slice(0,10)}.html`;
    link.href = URL.createObjectURL(blob);
    link.click();
    
    // 释放URL对象
    setTimeout(() => {
        URL.revokeObjectURL(link.href);
    }, 100);
    
    alert('HTML文件导出成功');
}



// 将图片转换为Base64
function getBase64Image(imgUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            try {
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } catch (error) {
                reject(error);
            }
        };
        img.onerror = function() {
            reject(new Error('图片加载失败'));
        };
        img.src = imgUrl;
    });
}

// 导出图片
async function exportImage() {
    if (projects.length === 0) {
        alert('暂无项目数据可导出');
        return;
    }
    
    // 按上市时间排序，时间早的靠前
    const sortedProjects = [...projects].sort((a, b) => {
        const dateA = a.launchDate ? new Date(a.launchDate) : new Date(9999, 11, 31); // 无日期的项目排在最后
        const dateB = b.launchDate ? new Date(b.launchDate) : new Date(9999, 11, 31);
        return dateA - dateB;
    });
    
    // 创建一个临时的HTML元素来生成图片内容
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '1400px'; // 足够宽的宽度
    tempDiv.style.padding = '50px';
    tempDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif';
    tempDiv.style.backgroundColor = '#0a1128'; // 深色背景
    tempDiv.style.color = '#ffffff'; // 白色文字
    
    // 构建HTML内容
    tempDiv.innerHTML = `
        <div style="max-width: 1400px; margin: 0 auto;">
            <header style="text-align: center; margin-bottom: 40px; padding: 40px 0;">
                <h1 style="font-size: 2.5rem; font-weight: 700; background: linear-gradient(90deg, #00d4ff, #7928ca); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 15px; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">蓝橙产品开发项目列表</h1>
                <p style="font-size: 1rem; color: #b0b8d4; margin-bottom: 30px; display: inline-block; padding: 8px 20px; background: rgba(255, 255, 255, 0.05); border-radius: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1);">导出时间: ${new Date().toLocaleString()}</p>
            </header>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 30px;">
                ${sortedProjects.map((project, index) => ` 
                    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 18px; padding: 0; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2); overflow: hidden; display: flex; flex-direction: column; height: 100%;">
                        <div style="width: 100%; height: 0; padding-bottom: 80%; position: relative; border-radius: 18px 18px 0 0;">
                            ${project.images && project.images.length > 0 ? `
                                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: url('${project.images[0]}'); background-size: cover; background-position: center; border-radius: 18px 18px 0 0;"></div>
                            ` : `
                                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%); display: flex; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.6); font-size: 14px; backdrop-filter: blur(10px); border-radius: 18px 18px 0 0;">暂无图片</div>
                            `}
                        </div>
                        <div style="padding: 25px; flex: 1; display: flex; flex-direction: column;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">
                                <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; flex: 1; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">${index + 1}. ${project.name}</h2>
                                <span style="display: inline-block; padding: 8px 16px; border-radius: 25px; font-size: 12px; font-weight: 600; white-space: nowrap; backdrop-filter: blur(10px); ${(() => {
                                    const status = project.status;
                                    if (status === '概念设计') return 'background: linear-gradient(135deg, #0070f3 0%, #0056b3 100%); color: white;';
                                    if (status === '原型开发') return 'background: linear-gradient(135deg, #ff7800 0%, #cc6000 100%); color: white;';
                                    if (status === '产品打样') return 'background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;';
                                    if (status === '模具开发') return 'background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white;';
                                    if (status === '样品测试') return 'background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white;';
                                    if (status === '模具优化') return 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;';
                                    if (status === '工艺参数优化') return 'background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;';
                                    if (status === '丝印 / 外观细节调整') return 'background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white;';
                                    if (status === '小批量试产') return 'background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white;';
                                    if (status === '批量生产') return 'background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white;';
                                    if (status === '上市筹备') return 'background: linear-gradient(135deg, #00c6fb 0%, #005bea 100%); color: white;';
                                    if (status === '推广准备') return 'background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: white;';
                                    if (status === '项目暂停') return 'background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;';
                                    return 'background: linear-gradient(135deg, #b0b8d4, #8a94b8); color: white;';
                                })()}">
                                    ${project.status}
                                </span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                                <div style="display: flex; flex-direction: column; padding: 12px 15px; background: rgba(255, 255, 255, 0.1); border-radius: 10px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1);">
                                    <div style="font-size: 11px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">品牌</div>
                                    <div style="font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">${project.brand || '未设置'}</div>
                                </div>
                                <div style="display: flex; flex-direction: column; padding: 12px 15px; background: rgba(255, 255, 255, 0.1); border-radius: 10px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1);">
                                    <div style="font-size: 11px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">类别</div>
                                    <div style="font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">${project.category}</div>
                                </div>
                                <div style="display: flex; flex-direction: column; padding: 12px 15px; background: rgba(255, 255, 255, 0.1); border-radius: 10px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1);">
                                    <div style="font-size: 11px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">类型</div>
                                    <div style="font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">${project.productType}</div>
                                </div>
                                <div style="display: flex; flex-direction: column; padding: 12px 15px; background: rgba(255, 255, 255, 0.1); border-radius: 10px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1);">
                                    <div style="font-size: 11px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">优先级</div>
                                    <div style="font-size: 14px; font-weight: 600; ${project.priority === '高' ? 'color: #ff6b6b;' : project.priority === '中' ? 'color: #ffd93d;' : 'color: #6bcb77;'};">${project.priority}</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding: 15px; background: rgba(255, 120, 0, 0.1); border-radius: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 120, 0, 0.2);">
                                <div style="position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                                    <svg width="80" height="80">
                                        <defs>
                                            <linearGradient id="progressGradient${index}" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stop-color="#9c27b0"/>
                                                <stop offset="100%" stop-color="#1e88e5"/>
                                            </linearGradient>
                                        </defs>
                                        <circle cx="40" cy="40" r="30" fill="none" stroke="#e0e0e0" stroke-width="10" stroke-linejoin="round" stroke-miterlimit="10"></circle>
                                        <circle cx="40" cy="40" r="30" fill="none" stroke="url(#progressGradient${index})" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" style="stroke-dasharray: ${2 * Math.PI * 30 * parseInt(project.progress) / 100} ${2 * Math.PI * 30}"></circle>
                                    </svg>
                                    <div style="text-align: center; position: absolute;">
                                        <div style="font-size: 16px; font-weight: 600; color: white;">${project.progress}</div>
                                    </div>
                                </div>
                                <div style="flex: 1;">
                                    <p style="margin: 6px 0; font-size: 14px; color: rgba(255, 255, 255, 0.8);">当前阶段: ${(() => {
                                        const progressValue = parseInt(project.progress);
                                        const steps = [
                                            { name: '概念设计', min: 0, max: 8.33 },
                                            { name: '原型开发', min: 8.33, max: 16.66 },
                                            { name: '产品打样', min: 16.66, max: 25 },
                                            { name: '模具开发', min: 25, max: 33.33 },
                                            { name: '样品测试', min: 33.33, max: 41.66 },
                                            { name: '模具优化', min: 41.66, max: 50 },
                                            { name: '工艺参数优化', min: 50, max: 58.33 },
                                            { name: '丝印 / 外观细节调整', min: 58.33, max: 66.66 },
                                            { name: '小批量试产', min: 66.66, max: 75 },
                                            { name: '批量生产', min: 75, max: 83.33 },
                                            { name: '上市筹备', min: 83.33, max: 91.66 },
                                            { name: '推广准备', min: 91.66, max: 100 }
                                        ];
                                        const currentStep = steps.find(step => progressValue >= step.min && progressValue < step.max) || steps[steps.length - 1];
                                        return currentStep.name;
                                    })()}</p>
                                    <p style="margin: 6px 0; font-size: 14px; color: rgba(255, 255, 255, 0.8);">上市日期: ${project.launchDate || '未设置'}</p>
                                </div>
                            </div>
                            ${project.remarks && project.remarks.length > 0 ? `
                            <div style="margin-top: auto; padding: 15px; background: rgba(255, 120, 0, 0.1); border-radius: 10px; border-left: 4px solid #0070f3; backdrop-filter: blur(10px);">
                                <p style="margin: 8px 0; font-size: 12px; color: rgba(255, 255, 255, 0.6); font-style: italic;">${new Date(project.remarks[project.remarks.length - 1].timestamp).toLocaleString()}</p>
                                <p style="margin: 8px 0; font-size: 14px; color: rgba(255, 255, 255, 0.8);">${project.remarks[project.remarks.length - 1].text}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // 将临时元素添加到页面
    document.body.appendChild(tempDiv);
    
    try {
        // 等待图片加载完成
        await new Promise(resolve => {
            const images = tempDiv.querySelectorAll('img');
            let loadedCount = 0;
            
            if (images.length === 0) {
                resolve();
                return;
            }
            
            images.forEach(img => {
                img.onload = () => {
                    loadedCount++;
                    if (loadedCount === images.length) {
                        resolve();
                    }
                };
                img.onerror = () => {
                    loadedCount++;
                    if (loadedCount === images.length) {
                        resolve();
                    }
                };
                // 触发图片加载
                if (img.complete) {
                    loadedCount++;
                    if (loadedCount === images.length) {
                        resolve();
                    }
                }
            });
        });
        
        // 使用html2canvas将HTML转换为图片，设置高分辨率
        const canvas = await html2canvas(tempDiv, {
            scale: 3, // 提高分辨率，生成高清图片
            useCORS: true, // 允许跨域图片
            logging: false,
            backgroundColor: '#0a1128',
            windowWidth: tempDiv.scrollWidth,
            windowHeight: tempDiv.scrollHeight,
            allowTaint: true
        });
        
        // 获取图片数据
        const imgData = canvas.toDataURL('image/png');
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `项目列表_${new Date().toISOString().slice(0,10)}.png`;
        link.href = imgData;
        link.click();
        
        alert('图片导出成功');
    } catch (error) {
        console.error('导出图片失败:', error);
        alert('导出图片失败: ' + error.message);
    } finally {
        // 移除临时元素
        document.body.removeChild(tempDiv);
    }
}

// 导出项目数据
function exportProjectData() {
    if (projects.length === 0) {
        alert('暂无项目数据可导出');
        return;
    }
    
    // 创建导出数据对象
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        projects: projects
    };
    
    // 将数据转换为JSON字符串
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // 创建Blob对象
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // 创建下载链接
    const link = document.createElement('a');
    link.download = `项目数据_${new Date().toISOString().slice(0,10)}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    
    // 释放URL对象
    setTimeout(() => {
        URL.revokeObjectURL(link.href);
    }, 100);
    
    // 更新最后导出时间
    updateLastExportTime();
    
    alert('项目数据导出成功');
    console.log('项目数据已导出，最后导出时间已更新');
}

// 导入项目数据
function importProjectData(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        alert('请选择JSON格式的文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            if (!importData.projects || !Array.isArray(importData.projects)) {
                throw new Error('无效的项目数据格式');
            }
            
            // 确认是否覆盖现有数据
            if (projects.length > 0) {
                if (!confirm('导入项目数据将会覆盖现有数据，确定要继续吗？')) {
                    return;
                }
            }
            
            // 替换现有项目数据
            projects = importData.projects;
            
            // 保存到IndexedDB
            saveToIndexedDB(projects).then(() => {
                // 保存到localStorage作为备份
                try {
                    localStorage.setItem('projects', JSON.stringify(projects));
                } catch (localError) {
                    console.error('保存到localStorage失败:', localError);
                }
                
                // 更新项目列表
                updateProjectList();
                
                alert('项目数据导入成功');
            }).catch(error => {
                console.error('保存到数据库失败:', error);
                // 即使保存到数据库失败，也要更新项目列表，因为数据已经导入到内存中
                updateProjectList();
                // 尝试直接保存到localStorage
                try {
                    localStorage.setItem('projects', JSON.stringify(projects));
                    alert('项目数据导入成功，已保存到本地存储');
                } catch (localError) {
                    console.error('保存到localStorage也失败:', localError);
                    alert('项目数据导入成功，但保存到存储失败');
                }
            });
        } catch (error) {
            console.error('导入项目数据失败:', error);
            alert('导入项目数据失败: ' + error.message);
        }
    };
    reader.onerror = function() {
        alert('读取文件失败');
    };
    reader.readAsText(file);
    
    // 重置文件输入
    event.target.value = '';
}

// 过滤项目
function filterProjects(searchTerm) {
    let filteredProjects = projects;
    
    if (searchTerm) {
        filteredProjects = projects.filter(project => {
            // 搜索项目名称、品牌、类别、类型等字段
            return project.name.toLowerCase().includes(searchTerm) ||
                   (project.brand && project.brand.toLowerCase().includes(searchTerm)) ||
                   project.category.toLowerCase().includes(searchTerm) ||
                   (project.productType && project.productType.toLowerCase().includes(searchTerm)) ||
                   project.priority.toLowerCase().includes(searchTerm) ||
                   project.status.toLowerCase().includes(searchTerm);
        });
    }
    
    // 应用当前的排序方式
    const sortBy = document.getElementById('sortBy')?.value || 'default';
    let sortedProjects = [...filteredProjects];
    
    switch (sortBy) {
        case 'progress':
            // 按进度排序，从高到低
            sortedProjects.sort((a, b) => {
                const progressA = parseInt(a.progress) || 0;
                const progressB = parseInt(b.progress) || 0;
                return progressB - progressA;
            });
            break;
        case 'priority':
            // 按优先级排序，高 > 中 > 低
            const priorityOrder = { '高': 3, '中': 2, '低': 1 };
            sortedProjects.sort((a, b) => {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });
            break;
        case 'launchDate':
            // 按上市时间排序，时间越早的在前
            sortedProjects.sort((a, b) => {
                const dateA = a.launchDate ? new Date(a.launchDate) : new Date(9999, 11, 31);
                const dateB = b.launchDate ? new Date(b.launchDate) : new Date(9999, 11, 31);
                return dateA - dateB;
            });
            break;
        default:
            // 默认按创建时间排序，最新的在前
            sortedProjects.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
    }
    
    // 更新项目列表显示
    const projectList = document.getElementById('projectList');
    if (!projectList) {
        console.error('项目列表面板未找到');
        return;
    }
    
    projectList.innerHTML = '';
    
    if (sortedProjects.length === 0) {
        projectList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>未找到匹配的项目</h3>
                <p>尝试使用其他关键词搜索</p>
            </div>
        `;
        return;
    }
    
    sortedProjects.forEach(project => {
        const progressValue = parseInt(project.progress) || 0;
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        
        // 获取项目主图
        let mainImage = '';
        if (project.images && project.images.length > 0) {
            mainImage = project.images[0];
        }
        
        // 计算优先级样式
        let priorityClass = '';
        switch (project.priority) {
            case '高':
                priorityClass = 'priority-high';
                break;
            case '中':
                priorityClass = 'priority-medium';
                break;
            case '低':
                priorityClass = 'priority-low';
                break;
        }
        
        // 计算进度颜色
        let progressColor = '';
        if (progressValue >= 100) {
            progressColor = 'progress-high';
        } else if (progressValue >= 75) {
            progressColor = 'progress-medium';
        } else if (progressValue >= 25) {
            progressColor = 'progress-low';
        } else {
            progressColor = 'progress-none';
        }
        
        // 获取最新备注
        let latestRemark = '';
        if (project.remarks && project.remarks.length > 0) {
            const sortedRemarks = [...project.remarks].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            latestRemark = sortedRemarks[0].text;
        }
        
        projectCard.innerHTML = `
            <div class="project-card-image">
                ${mainImage ? `
                <img src="${mainImage}" alt="${project.name}" class="project-image">
                ` : `
                <div class="no-image">暂无图片</div>
                `}
            </div>
            <div class="project-card-content">
                <div class="project-card-header">
                    <h3>${project.name}</h3>
                    <span class="status-tag ${project.status}">${project.status}</span>
                </div>
                <div class="project-card-info">
                    <div class="info-item">
                        <span class="info-label">品牌</span>
                        <span class="info-value">${project.brand || '未设置'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">类别</span>
                        <span class="info-value">${project.category}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">类型</span>
                        <span class="info-value">${project.productType || '未设置'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">优先级</span>
                        <span class="info-value priority-${project.priority}">${project.priority}</span>
                    </div>
                </div>
                <div class="project-card-progress">
                    <div class="progress-ring-small">
                        <svg width="50" height="50">
                            <defs>
                                <linearGradient id="gradientSmall" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#667eea" />
                                    <stop offset="100%" stop-color="#764ba2" />
                                </linearGradient>
                            </defs>
                            <circle class="progress-ring-circle-small" cx="25" cy="25" r="20"></circle>
                            <circle class="progress-ring-progress-small" cx="25" cy="25" r="20" 
                                    style="stroke-dasharray: ${2 * Math.PI * 20}; stroke-dashoffset: ${2 * Math.PI * 20 * (1 - progressValue / 100)}"></circle>
                        </svg>
                    </div>
                    <div class="progress-details">
                        <p><strong>进度:</strong> ${project.progress}</p>
                        ${project.launchDate ? `<p><strong>上市:</strong> ${project.launchDate}</p>` : ''}
                    </div>
                </div>
                ${project.remarks && project.remarks.length > 0 ? `
                <div class="project-card-remarks">
                    <p><strong>最新备注:</strong> ${project.remarks[project.remarks.length - 1].text.substring(0, 30)}${project.remarks[project.remarks.length - 1].text.length > 30 ? '...' : ''}</p>
                </div>
                ` : ''}
                <div class="project-card-actions">
                    <button class="btn btn-small" onclick="loadProject('${project.id}')">编辑</button>
                    <button class="btn btn-small" onclick="deleteProject('${project.id}')">删除</button>
                    <button class="btn btn-small" onclick="showDetails('${project.id}')">详情</button>
                </div>
            </div>
        `;
        
        projectList.appendChild(projectCard);
    });
}

// 排序项目
function sortProjects(sortBy) {
    // 获取当前搜索词
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    filterProjects(searchTerm);
}



// 更新项目列表
function updateProjectList() {
    // 获取当前排序方式
    const sortBy = document.getElementById('sortBy')?.value || 'default';
    sortProjects(sortBy);
}

// 当前编辑的项目ID
let currentEditProjectId = null;

// 加载项目
function loadProject(id) {
    const project = projects.find(p => p.id === id);
    if (project) {
        // 存储当前编辑的项目ID
        currentEditProjectId = id;
        
        // 填充表单
        document.getElementById('projectName').value = project.name;
        document.getElementById('brand').value = project.brand || '';
        document.getElementById('productCategory').value = project.category;
        document.getElementById('productType').value = project.productType || '';
        document.getElementById('priority').value = project.priority;
        document.getElementById('estimatedLaunchDate').value = project.launchDate || '';
        document.getElementById('remarks').value = ''; // 清空备注输入框，避免混淆
        document.getElementById('statusText').textContent = project.status;
        
        // 加载图片
        uploadedImages = project.images || [];
        updateImagePreview();
        
        // 更新状态按钮
        const statusButtons = document.querySelectorAll('.status-btn');
        statusButtons.forEach(btn => {
            if (btn.getAttribute('data-status') === project.status) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // 更新进度
        const progress = parseInt(project.progress) || 0;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressPercentage').textContent = project.progress;
        
        // 滚动到表单顶部
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    }
}

// 删除项目
async function deleteProject(id) {
    if (confirm('确定要删除这个项目吗？')) {
        projects = projects.filter(p => p.id !== id);
        
        // 保存到SQLite
        try {
            await saveToSQLite(projects);
            console.log('SQLite删除项目成功');
        } catch (dbError) {
            console.error('SQLite删除失败:', dbError);
            // 降级到localStorage
            localStorage.setItem('projects', JSON.stringify(projects));
            console.log('本地存储删除项目成功');
        }
        
        updateProjectList();
    }
}

// 从SQLite加载项目
async function loadProjects() {
    try {
        // 首先尝试从SQLite加载
        const sqliteProjects = await loadFromSQLite();
        if (sqliteProjects && sqliteProjects.length > 0) {
            projects = sqliteProjects;
            console.log('从SQLite加载项目成功');
        } else {
            // 如果SQLite没有数据，尝试从localStorage加载
            const storedProjects = localStorage.getItem('projects');
            if (storedProjects) {
                projects = JSON.parse(storedProjects);
                console.log('从localStorage加载项目成功');
                // 同时保存到SQLite
                try {
                    await saveToSQLite(projects);
                    console.log('项目数据同步到SQLite成功');
                } catch (e) {
                    console.error('同步到SQLite失败:', e);
                }
            } else {
                // 如果localStorage也没有数据，尝试从数据文件夹加载
                console.log('尝试从数据文件夹加载项目数据');
                promptLoadFromDataFolder();
            }
        }
        updateProjectList();
    } catch (error) {
        console.error('加载项目时出错:', error);
        // 降级到localStorage
        const storedProjects = localStorage.getItem('projects');
        if (storedProjects) {
            projects = JSON.parse(storedProjects);
            updateProjectList();
        } else {
            // 如果所有存储都失败，尝试从数据文件夹加载
            promptLoadFromDataFolder();
        }
    }
}

// 提示从数据文件夹加载
function promptLoadFromDataFolder() {
    if (confirm('是否从数据文件夹加载项目数据？')) {
        // 创建文件输入元素
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        // 监听文件选择事件
        fileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                try {
                    const importData = await loadProjectsFromFileSystem(file);
                    projects = importData;
                    
                    // 保存到SQLite
                    try {
                        await saveToSQLite(projects);
                        console.log('项目数据保存到SQLite成功');
                    } catch (dbError) {
                        console.error('保存到SQLite失败:', dbError);
                        // 降级到localStorage
                        try {
                            localStorage.setItem('projects', JSON.stringify(projects));
                            console.log('项目数据保存到localStorage成功');
                        } catch (localError) {
                            console.error('保存到localStorage失败:', localError);
                        }
                    }
                    
                    updateProjectList();
                    alert('项目数据加载成功');
                } catch (error) {
                    console.error('加载项目数据失败:', error);
                    alert('加载项目数据失败: ' + error.message);
                }
            }
        });
        
        // 触发文件选择
        fileInput.click();
    }
}

// 从database文件夹加载项目数据
function loadProjectsFromDatabaseFolder() {
    // 创建文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    // 监听文件选择事件
    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        
        try {
            // 从文件中加载项目数据
            const loadedProjects = await loadProjectsFromFileSystem(file);
            
            // 确认是否覆盖现有数据
            if (projects.length > 0) {
                if (!confirm('加载项目数据将会覆盖现有数据，确定要继续吗？')) {
                    return;
                }
            }
            
            // 替换现有项目数据
            projects = loadedProjects;
            
            // 保存到IndexedDB
            try {
                await saveToIndexedDB(projects);
                console.log('保存到IndexedDB成功');
            } catch (dbError) {
                console.error('保存到IndexedDB失败:', dbError);
                
                // 降级到localStorage
                try {
                    localStorage.setItem('projects', JSON.stringify(projects));
                    console.log('保存到localStorage成功');
                } catch (storageError) {
                    console.error('保存到localStorage失败:', storageError);
                }
            }
            
            // 更新项目列表
            updateProjectList();
            
            alert('从database文件夹加载项目数据成功');
        } catch (error) {
            console.error('加载项目数据失败:', error);
            alert('加载项目数据失败: ' + error.message);
        }
    });
    
    // 触发文件选择对话框
    fileInput.click();
}

// 更新图片预览
function updateImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.innerHTML = '';
    uploadedImages.forEach((imageUrl, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        previewItem.innerHTML = `
            <img src="${imageUrl}" alt="产品图片">
            <button class="remove-btn" data-index="${index}">×</button>
        `;
        imagePreview.appendChild(previewItem);
    });

    // 添加删除按钮事件
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            uploadedImages.splice(index, 1);
            updateImagePreview();
        });
    });
}

// 显示项目详情
function showDetails(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        alert('未找到该项目');
        return;
    }
    
    let detailsHTML = `
        <div class="history-modal">
            <div class="history-modal-header">
                <h2>📋 ${project.name} - 项目详情</h2>
                <p class="history-subtitle">共 ${project.history ? project.history.length : 0} 条历史记录</p>
            </div>
            <div class="history-modal-content">
                <!-- 项目图片 -->
                <div class="project-details-images">
                    <h3>项目图片</h3>
                    <div class="details-images-container">
    `;
    
    // 显示项目图片
    if (project.images && project.images.length > 0) {
        project.images.forEach((imageUrl, index) => {
            detailsHTML += `
                <div class="details-image-item">
                    <img src="${imageUrl}" alt="项目图片 ${index + 1}">
                </div>
            `;
        });
    } else {
        detailsHTML += `
            <div class="details-image-empty">
                <p>暂无图片</p>
            </div>
        `;
    }
    
    detailsHTML += `
                    </div>
                </div>
                
                <!-- 项目备注 -->
                <div class="project-details-remarks">
                    <h3>项目备注</h3>
    `;
    
    if (project.remarks && project.remarks.length > 0) {
        // 按时间戳降序排序，最新的在前
        const sortedRemarks = [...project.remarks].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        sortedRemarks.forEach((remark, index) => {
            const date = new Date(remark.timestamp);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString();
            
            // 为最新的备注添加特殊样式类
            const isLatest = index === 0;
            const remarkClass = isLatest ? 'remark-entry latest-remark' : 'remark-entry';
            
            detailsHTML += `
                <div class="${remarkClass}">
                    <div class="remark-header">
                        <span class="remark-time">${dateStr} ${timeStr}</span>
                    </div>
                    <div class="remark-content">${remark.text}</div>
                </div>
            `;
        });
    } else {
        detailsHTML += `
            <div class="remarks-empty">
                <p>暂无备注</p>
            </div>
        `;
    }
    
    detailsHTML += `
                </div>
                
                <!-- 历史记录 -->
                <div class="project-details-history">
                    <h3>历史修改记录</h3>
    `
    
    if (!project.history || project.history.length === 0) {
        detailsHTML += `
            <div class="history-empty">
                <p>暂无历史记录</p>
            </div>
        `;
    } else {
        const sortedHistory = [...project.history].reverse();
        
        sortedHistory.forEach((entry, index) => {
            const date = new Date(entry.timestamp);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString();
            
            // 获取上一次的状态（如果有）
            const prevEntry = index < sortedHistory.length - 1 ? sortedHistory[index + 1] : null;
            
            // 比较差异
            const changes = [];
            if (prevEntry) {
                const changeFields = ['status', 'progress', 'priority', 'brand', 'category', 'productType'];
                changeFields.forEach(field => {
                    const currentVal = entry.changes[field] || '无';
                    const prevVal = prevEntry.changes[field] || '无';
                    if (currentVal !== prevVal) {
                        changes.push({
                            field: field,
                            from: prevVal,
                            to: currentVal
                        });
                    }
                });
            }
            
            const changeCount = changes.length;
            
            detailsHTML += `
                <div class="history-entry ${changeCount > 0 ? 'has-changes' : ''}">
                    <div class="history-entry-header">
                        <div class="history-entry-time">
                            <span class="date">${dateStr}</span>
                            <span class="time">${timeStr}</span>
                        </div>
                        <div class="history-entry-action ${entry.action === '创建' ? 'action-create' : 'action-update'}">
                            ${entry.action === '创建' ? '🆕' : '✏️'} ${entry.action}项目
                        </div>
                    </div>
                    <div class="history-entry-details">
                        <div class="history-detail-grid">
            `;
            
            // 显示所有字段
            const fields = [
                { key: 'name', label: '项目名称' },
                { key: 'brand', label: '品牌' },
                { key: 'category', label: '产品类别' },
                { key: 'productType', label: '开发类型' },
                { key: 'priority', label: '优先级' },
                { key: 'status', label: '项目状态' },
                { key: 'progress', label: '完成进度' }
            ];
            
            fields.forEach(field => {
                const value = entry.changes[field.key] || '未设置';
                const isChanged = changes.some(c => c.field === field.key);
                const changeInfo = isChanged ? changes.find(c => c.field === field.key) : null;
                
                if (isChanged && changeInfo) {
                    detailsHTML += `
                        <div class="history-field changed">
                            <span class="field-label">${field.label}</span>
                            <span class="field-value">
                                <span class="old-value">${changeInfo.from}</span>
                                <span class="arrow">→</span>
                                <span class="new-value">${changeInfo.to}</span>
                            </span>
                        </div>
                    `;
                } else {
                    detailsHTML += `
                        <div class="history-field">
                            <span class="field-label">${field.label}</span>
                            <span class="field-value">${value}</span>
                        </div>
                    `;
                }
            });
            
            detailsHTML += `
                        </div>
            `;
            
            // 如果有变化，添加变化提示
            if (changeCount > 0) {
                detailsHTML += `
                    <div class="change-summary">
                        <span class="change-icon">⚡</span>
                        <span class="change-text">本次修改了 <strong>${changeCount}</strong> 项内容</span>
                    </div>
                `;
            }
            
            detailsHTML += `
                    </div>
                </div>
            `;
        });
    }
    
    detailsHTML += `
                </div>
            </div>
        </div>
    `;
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal history-modal-container';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="history-modal-dialog">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            ${detailsHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 点击模态框外部关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 添加历史记录的CSS样式
const style = document.createElement('style');
style.textContent = `
    /* 深色宝蓝色系主题变量 */
    :root {
        --primary-bg: #0a1128;
        --secondary-bg: #121c38;
        --card-bg: #1a2542;
        --accent-color: #00d4ff;
        --text-primary: #ffffff;
        --text-secondary: #b0b8d4;
        --border-color: #2a395f;
        --success-color: #00ff9f;
        --warning-color: #ffaa00;
        --danger-color: #ff3d71;
    }
    
    .history-modal-container {
        background: rgba(0, 10, 30, 0.8);
        backdrop-filter: blur(10px);
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    
    .history-modal-dialog {
        background: var(--card-bg);
        border-radius: 16px;
        max-width: 90%;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        position: relative;
        box-shadow: 0 20px 60px rgba(0, 212, 255, 0.2);
        animation: modalFadeIn 0.3s ease-out;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    @keyframes modalFadeIn {
        from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
    
    .history-modal-header {
        padding: 25px 30px;
        background: linear-gradient(135deg, var(--primary-bg), var(--secondary-bg));
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-color);
    }
    
    .history-modal-header h2 {
        margin: 0 0 5px 0;
        font-size: 24px;
        background: linear-gradient(90deg, var(--accent-color), #7928ca);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    
    .history-subtitle {
        margin: 0;
        opacity: 0.9;
        font-size: 14px;
        color: var(--text-secondary);
    }
    
    .history-modal-content {
        max-height: calc(90vh - 120px);
        overflow-y: auto;
        padding: 20px 30px 30px;
    }
    
    .history-empty {
        text-align: center;
        padding: 50px;
        color: var(--text-secondary);
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
    }
    
    .history-entry {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid var(--border-color);
        border-radius: 12px;
        padding: 15px 20px;
        margin-bottom: 15px;
        transition: all 0.3s ease;
    }
    
    .history-entry:hover {
        border-color: var(--accent-color);
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.1);
    }
    
    .history-entry.has-changes {
        border-color: var(--accent-color);
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(121, 40, 202, 0.05) 100%);
    }
    
    .history-entry-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--border-color);
    }
    
    .history-entry-time {
        display: flex;
        gap: 10px;
        align-items: center;
    }
    
    .history-entry-time .date {
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .history-entry-time .time {
        color: var(--text-secondary);
        font-size: 13px;
    }
    
    .history-entry-action {
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
    }
    
    .action-create {
        background: linear-gradient(135deg, var(--success-color), #00cc7f);
        color: var(--primary-bg);
    }
    
    .action-update {
        background: linear-gradient(135deg, var(--accent-color), #7928ca);
        color: var(--primary-bg);
    }
    
    .history-detail-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }
    
    .history-field {
        display: flex;
        justify-content: space-between;
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        font-size: 13px;
    }
    
    .history-field.changed {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(121, 40, 202, 0.15) 100%);
        border: 1px solid var(--accent-color);
    }
    
    .field-label {
        color: var(--text-secondary);
    }
    
    .field-value {
        font-weight: 500;
        color: var(--text-primary);
    }
    
    .history-field.changed .field-value .old-value {
        color: var(--danger-color);
        text-decoration: line-through;
    }
    
    .history-field.changed .field-value .arrow {
        color: var(--accent-color);
        margin: 0 5px;
    }
    
    .history-field.changed .field-value .new-value {
        color: var(--success-color);
        font-weight: 700;
    }
    
    .change-summary {
        margin-top: 12px;
        padding: 8px 12px;
        background: rgba(0, 212, 255, 0.1);
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .change-icon {
        font-size: 16px;
    }
    
    .change-text {
        color: var(--accent-color);
        font-size: 13px;
    }
    
    .change-text strong {
        color: var(--success-color);
    }
    
    .close {
        position: absolute;
        right: 15px;
        top: 15px;
        font-size: 24px;
        font-weight: bold;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        transition: color 0.3s ease;
        z-index: 10;
    }
    
    .close:hover {
        color: var(--accent-color);
    }
    
    .project-details-images {
        margin-bottom: 30px;
    }
    
    .project-details-images h3,
    .project-details-remarks h3,
    .project-details-history h3 {
        margin-bottom: 15px;
        color: var(--text-primary);
        font-size: 18px;
        border-left: 3px solid var(--accent-color);
        padding-left: 10px;
    }
    
    .details-images-container {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
    }
    
    .details-image-item {
        flex: 1 1 150px;
        max-width: 200px;
    }
    
    .details-image-item img {
        width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        transition: transform 0.3s ease;
    }
    
    .details-image-item img:hover {
        transform: scale(1.05);
    }
    
    .details-image-empty {
        flex: 1 1 100%;
        text-align: center;
        padding: 40px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        color: var(--text-secondary);
    }
    
    /* 备注样式 */
    .project-details-remarks {
        margin-bottom: 30px;
    }
    
    .remark-entry {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 10px;
        border-left: 3px solid var(--accent-color);
    }
    
    .remark-header {
        margin-bottom: 8px;
    }
    
    .remark-time {
        font-size: 12px;
        color: var(--text-secondary);
    }
    
    .remark-content {
        color: #999; /* 旧备注使用灰色文字 */
        line-height: 1.4;
    }
    
    /* 最新备注样式 */
    .latest-remark {
        background: rgba(255, 255, 255, 0.1);
        border-left-color: #00d4ff;
    }
    
    .latest-remark .remark-content {
        color: white; /* 最新备注使用白色文字 */
        font-weight: 500;
    }
    
    .remarks-empty {
        text-align: center;
        padding: 40px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        color: var(--text-secondary);
    }
    
    /* 响应式设计 */
    @media (max-width: 768px) {
        .history-modal-dialog {
            max-width: 98%;
            width: 98%;
            max-height: 95vh;
        }
        
        .history-detail-grid {
            grid-template-columns: 1fr;
        }
        
        .history-modal-header {
            padding: 20px;
        }
        
        .history-modal-content {
            padding: 15px 20px 20px;
            max-height: calc(95vh - 100px);
        }
        
        .details-image-item {
            flex: 1 1 100%;
            max-width: 100%;
        }
    }
    
    /* 滚动条样式 */
    .history-modal-content::-webkit-scrollbar {
        width: 8px;
    }
    
    .history-modal-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
    }
    
    .history-modal-content::-webkit-scrollbar-thumb {
        background: rgba(0, 212, 255, 0.5);
        border-radius: 10px;
    }
    
    .history-modal-content::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 212, 255, 0.8);
    }
`;
document.head.appendChild(style);