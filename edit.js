// ==================== 页面过渡动画 ====================
function showPageTransition() {
    const transition = document.getElementById('pageTransition');
    if (transition) {
        transition.classList.add('active');
    }
}

function hidePageTransition() {
    const transition = document.getElementById('pageTransition');
    if (transition) {
        transition.classList.remove('active');
    }
}

// ==================== Supabase配置 ====================
const SUPABASE_URL = 'https://rbknbetkdbnlejtaykuq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__buesO2Qc5sXtLvBkLQpuQ_6dfF7z6u';

let supabaseClient = null;
let supabaseInitialized = false;
let uploadedImages = [];
let projects = [];
let currentEditProjectId = null;
let currentUser = null;

// ==================== Supabase初始化 ====================
async function initSupabaseClient() {
    console.log('[Edit] 开始初始化Supabase客户端...');

    try {
        let retryCount = 0;
        const maxRetries = 10;

        const tryInit = async () => {
            if (window.supabase) {
                if (!window.supabaseInstance) {
                    window.supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                }
                supabaseClient = window.supabaseInstance;
                supabaseInitialized = true;
                console.log('[Edit] ✅ Supabase客户端初始化成功');
                return true;
            }
            return false;
        };

        if (await tryInit()) return;

        const retryInterval = setInterval(async () => {
            retryCount++;
            console.log(`[Edit] 等待Supabase SDK加载... (${retryCount}/${maxRetries})`);

            if (await tryInit()) {
                clearInterval(retryInterval);
                return;
            }

            if (retryCount >= maxRetries) {
                clearInterval(retryInterval);
                console.error('[Edit] ❌ Supabase SDK加载超时');
                alert('Supabase服务连接超时，请检查网络连接或刷新页面');
            }
        }, 500);

    } catch (error) {
        console.error('[Edit] ❌ Supabase初始化失败:', error);
    }
}

// ==================== 从localStorage加载项目数据 ====================
function loadProjectsFromStorage() {
    try {
        // 优先从 projects_cache 加载（与 script.js 保持一致）
        const stored = localStorage.getItem('projects_cache');
        if (stored) {
            projects = JSON.parse(stored);
            console.log('[Edit] 已从localStorage加载项目数据:', projects.length);
        } else {
            // 兼容旧版本，尝试从 projects key 加载
            const oldStored = localStorage.getItem('projects');
            if (oldStored) {
                projects = JSON.parse(oldStored);
                console.log('[Edit] 已从旧版localStorage加载项目数据:', projects.length);
            } else {
                projects = [];
                console.log('[Edit] localStorage中没有项目数据');
            }
        }
    } catch (error) {
        console.error('[Edit] 加载项目数据失败:', error);
        projects = [];
    }
}

// ==================== 保存项目到localStorage ====================
function saveProjectsToStorage() {
    try {
        // 使用 projects_cache key（与 script.js 保持一致）
        localStorage.setItem('projects_cache', JSON.stringify(projects));
        console.log('[Edit] 项目数据已保存到localStorage');
    } catch (error) {
        console.error('[Edit] 保存项目数据失败:', error);
    }
}

// ==================== 解析URL参数 ====================
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// ==================== 加载项目数据到表单 ====================
function loadProjectToForm(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        console.error('[Edit] 未找到项目:', projectId);
        return false;
    }

    console.log('[Edit] 加载项目数据:', project.name);
    console.log('[Edit] 项目完整数据:', JSON.stringify(project, null, 2));

    // 更新页面标题
    document.getElementById('pageTitle').textContent = '编辑项目';

    // 填充表单
    document.getElementById('projectName').value = project.name || '';
    document.getElementById('brand').value = project.brand || '';
    
    // 加载类别（category）
    const categoryValue = project.category || '';
    console.log('[Edit] 类别值:', categoryValue);
    document.getElementById('productCategory').value = categoryValue;
    
    // 加载状态（productType）
    const statusValue = project.productType || '';
    console.log('[Edit] 状态值:', statusValue);
    document.getElementById('productType').value = statusValue;
    
    document.getElementById('priority').value = project.priority || '';
    document.getElementById('estimatedLaunchDate').value = project.launchDate || '';
    document.getElementById('remarks').value = '';
    document.getElementById('statusText').textContent = project.status || '未设置';

    // 加载图片
    uploadedImages = project.images || [];
    updateImagePreview();

    // 更新状态按钮
    const statusButtons = document.querySelectorAll('.status-btn');
    let statusFound = false;
    statusButtons.forEach(btn => {
        const btnStatus = btn.getAttribute('data-status');
        if (btnStatus === project.status) {
            btn.classList.add('active');
            statusFound = true;
            console.log('[Edit] 状态按钮匹配成功:', btnStatus);
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 如果没有匹配的状态按钮，检查是否有自定义状态
    if (!statusFound && project.status) {
        console.log('[Edit] 未找到匹配的状态按钮，状态值:', project.status);
        // 设置自定义状态输入框
        const customStatusInput = document.getElementById('customStatus');
        if (customStatusInput) {
            customStatusInput.value = project.status;
        }
    }

    // 更新当前状态显示
    document.getElementById('statusText').textContent = project.status || '未设置';

    // 更新进度
    const progress = parseInt(project.progress) || 0;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressPercentage').textContent = project.progress || '0%';

    // 更新圆形进度条
    const circularProgressFill = document.getElementById('circularProgressFill');
    if (circularProgressFill) {
        const circumference = 2 * Math.PI * 30; // 半径为30的圆的周长
        const dashOffset = circumference - (circumference * progress / 100);
        circularProgressFill.style.strokeDashoffset = dashOffset;
        const circularProgressText = circularProgressFill.parentElement.nextElementSibling;
        if (circularProgressText) {
            circularProgressText.textContent = project.progress || '0%';
        }
    }

    return true;
}

// ==================== 保存项目 ====================
async function saveProject() {
    console.log('[Edit] 开始保存项目...');

    try {
        const projectName = document.getElementById('projectName').value;
        const brand = document.getElementById('brand').value;
        const productCategory = document.getElementById('productCategory').value;
        const productType = document.getElementById('productType').value;
        const priority = document.getElementById('priority').value;
        const estimatedLaunchDate = document.getElementById('estimatedLaunchDate').value;
        const remarks = document.getElementById('remarks').value;
        const status = document.getElementById('statusText').textContent;
        const progress = document.getElementById('progressPercentage').textContent;

        if (!projectName || !productCategory || !productType || !priority) {
            alert('请填写必填字段');
            return false;
        }

        // 验证日期格式
        function isValidDate(dateString) {
            if (!dateString) return false;
            const date = new Date(dateString);
            return date instanceof Date && !isNaN(date);
        }

        // 构建项目数据
        const projectData = {
            id: currentEditProjectId || Date.now().toString(),
            name: projectName,
            brand: brand,
            category: productCategory,
            productType: productType,
            priority: priority,
            launchDate: isValidDate(estimatedLaunchDate) ? estimatedLaunchDate : '',
            status: status,
            progress: progress,
            images: uploadedImages,
            createdAt: new Date().toISOString()
        };

        // 处理备注
        if (remarks) {
            const newRemark = {
                text: remarks,
                timestamp: new Date().toISOString()
            };

            const existingIndex = projects.findIndex(p => p.id === projectData.id);
            if (existingIndex >= 0) {
                projectData.remarks = [...(projects[existingIndex].remarks || []), newRemark];
            } else {
                projectData.remarks = [newRemark];
            }
        } else {
            const existingIndex = projects.findIndex(p => p.id === projectData.id);
            if (existingIndex >= 0) {
                projectData.remarks = projects[existingIndex].remarks || [];
            }
        }

        // 记录历史
        const existingIndex = projects.findIndex(p => p.id === projectData.id);
        const historyEntry = {
            timestamp: new Date().toISOString(),
            action: existingIndex >= 0 ? '更新' : '创建',
            changes: {
                name: projectData.name,
                brand: projectData.brand,
                category: projectData.category,
                productType: projectData.productType,
                priority: projectData.priority,
                launchDate: projectData.launchDate,
                status: projectData.status,
                progress: projectData.progress
            }
        };

        if (existingIndex >= 0) {
            // 更新现有项目
            projectData.remarks = projectData.remarks || [];
            projects[existingIndex] = {
                ...projects[existingIndex],
                ...projectData
            };

            // 添加历史记录
            if (!projects[existingIndex].history) {
                projects[existingIndex].history = [];
            }
            projects[existingIndex].history.push(historyEntry);

            console.log('[Edit] 更新项目:', projectData.name);
        } else {
            // 新建项目
            projectData.history = [historyEntry];
            projects.push(projectData);
            console.log('[Edit] 新建项目:', projectData.name);
        }

        // 保存到localStorage（优先保证本地保存）
        saveProjectsToStorage();
        console.log('[Edit] 项目已保存到本地');

        // 如果Supabase已初始化，尝试同步到云端（失败不影响本地保存）
        if (supabaseInitialized && supabaseClient) {
            try {
                // 将驼峰格式的属性名转换为下划线格式以匹配数据库列名
                const projectToSave = projects.find(p => p.id === projectData.id);
                
                // 处理日期字段：空字符串转换为null，确保格式正确
                const formatDate = (dateStr) => {
                    if (!dateStr || dateStr === '') {
                        return null;
                    }
                    // 确保日期格式是 PostgreSQL 可以接受的格式 (YYYY-MM-DD)
                    const date = new Date(dateStr);
                    if (isNaN(date.getTime())) {
                        return null;
                    }
                    return date.toISOString().split('T')[0];
                };
                
                const dbProject = {
                    id: projectToSave.id,
                    name: projectToSave.name,
                    brand: projectToSave.brand,
                    category: projectToSave.category,
                    product_type: projectToSave.productType,
                    priority: projectToSave.priority,
                    launch_date: formatDate(projectToSave.launchDate),
                    status: projectToSave.status,
                    progress: projectToSave.progress,
                    images: (projectToSave.images && projectToSave.images.length > 0) ? projectToSave.images : null,
                    remarks: JSON.stringify(projectToSave.remarks || []),
                    history: JSON.stringify(projectToSave.history || []),
                    created_at: projectToSave.createdAt ? new Date(projectToSave.createdAt).toISOString() : new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                // 调试：输出要保存的数据
                console.log('[Edit] 准备保存到数据库的数据:', JSON.stringify(dbProject, null, 2));
                
                const { error } = await supabaseClient
                    .from('projects')
                    .upsert([dbProject]);

                if (error) {
                    console.error('[Edit] 同步到云端失败:', error);
                    // 云端同步失败不影响本地保存，只显示警告
                    console.warn('[Edit] 云端同步失败，但项目已保存到本地');
                } else {
                    console.log('[Edit] 已同步到云端');
                }
            } catch (error) {
                console.error('[Edit] 同步到云端异常:', error);
                // 异常不影响本地保存
                console.warn('[Edit] 云端同步异常，但项目已保存到本地');
            }
        }

        alert('项目保存成功！');
        return true;

    } catch (error) {
        console.error('[Edit] 保存项目失败:', error);
        alert('保存失败，请稍后重试');
        return false;
    }
}

// ==================== 图片处理功能 ====================
function base64ToBlob(base64) {
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

function compressImage(imageDataUrl, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = function() {
        const maxWidth = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedDataUrl);
    };

    img.src = imageDataUrl;
}

function updateImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    if (!imagePreview) return;

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

function handleImageFiles(files) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            compressImage(e.target.result, function(compressedDataUrl) {
                uploadedImages.push(compressedDataUrl);
                updateImagePreview();
            });
        };
        reader.readAsDataURL(file);
    });
}

// ==================== 状态按钮事件 ====================
function initializeStatusButtons() {
    const statusButtons = document.querySelectorAll('.status-btn');
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    const circularProgressFill = document.getElementById('circularProgressFill');
    const statusText = document.getElementById('statusText');
    const setCustomStatusBtn = document.getElementById('setCustomStatus');
    const customStatusInput = document.getElementById('customStatus');

    statusButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                statusButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                const status = this.getAttribute('data-status');
                const progress = parseInt(this.getAttribute('data-progress'));

                statusText.textContent = status;

                if (progress >= 0) {
                    progressFill.style.width = `${progress}%`;
                    progressPercentage.textContent = `${progress}%`;

                    const circumference = 2 * Math.PI * 30; // 半径为30的圆的周长
                    const dashOffset = circumference - (circumference * progress / 100);
                    circularProgressFill.style.strokeDashoffset = dashOffset;
                    const circularProgressText = circularProgressFill.parentElement.nextElementSibling;
                    if (circularProgressText) {
                        circularProgressText.textContent = `${progress}%`;
                    }
                }
            });
        });

    // 自定义状态按钮
    if (setCustomStatusBtn) {
        setCustomStatusBtn.addEventListener('click', function() {
            const customStatus = customStatusInput.value.trim();
            if (customStatus) {
                statusButtons.forEach(b => b.classList.remove('active'));
                statusText.textContent = customStatus;
                customStatusInput.value = '';
            }
        });
    }
}

// ==================== 拖拽上传功能 ====================
function initializeDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (!dropZone || !fileInput) return;

    // 点击上传
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });

    // 文件选择
    fileInput.addEventListener('change', function() {
        handleImageFiles(this.files);
        this.value = '';
    });

    // 拖拽上传
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        handleImageFiles(e.dataTransfer.files);
    });

    // 粘贴图片
    document.addEventListener('paste', function(e) {
        const items = e.clipboardData.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    handleImageFiles([items[i].getAsFile()]);
                }
            }
        }
    });
}

// ==================== 表单验证 ====================
function initializeFormValidation() {
    const projectForm = document.getElementById('projectForm');
    const estimatedLaunchDate = document.getElementById('estimatedLaunchDate');

    if (estimatedLaunchDate) {
        estimatedLaunchDate.addEventListener('blur', function() {
            const value = this.value.trim();
            if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                alert('日期格式不正确，请使用 YYYY-MM-DD 格式');
                this.value = '';
            }
        });
    }
}

// ==================== 返回主页 ====================
function goBack() {
    showPageTransition();
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 300);
}

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('[Edit] 页面加载完成');

    // 初始化Supabase
    await initSupabaseClient();

    // 加载项目数据
    loadProjectsFromStorage();

    // 获取项目ID参数 - 优先从URL获取，其次从sessionStorage获取
    let projectId = getUrlParameter('id');
    if (!projectId) {
        projectId = sessionStorage.getItem('currentEditProjectId');
    }
    currentEditProjectId = projectId;

    // 清除sessionStorage中的项目ID
    sessionStorage.removeItem('currentEditProjectId');

    // 如果有ID，加载项目数据
    if (projectId) {
        loadProjectToForm(projectId);
    } else {
        document.getElementById('pageTitle').textContent = '新增项目';
        console.log('[Edit] 新增项目模式');
    }

    // 初始化状态按钮
    initializeStatusButtons();

    // 初始化拖拽上传
    initializeDropZone();

    // 初始化表单验证
    initializeFormValidation();

    // 保存按钮事件
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
            const success = await saveProject();
            if (success) {
                goBack();
            }
        });
    }

    // 取消按钮事件
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', goBack);
    }

    // 隐藏过渡动画
    hidePageTransition();
});