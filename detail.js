// Supabase 配置
let supabaseClient = null;
let currentProject = null;

// 初始化 Supabase 客户端
async function initSupabaseClient() {
    try {
        const supabaseUrl = 'https://rbknbetkdbnlejtaykuq.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJia25iZXRrZGJubGVqdGF5a3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1NDk5OTUsImV4cCI6MjAyNTEyNTk5NX0.C8oYcYFqMhY9vY2Y9vY2Y9vY2Y9vY2Y9vY2Y9vY2Y';
        
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log('[Detail] Supabase 初始化完成');
        return true;
    } catch (error) {
        console.error('[Detail] Supabase 初始化失败:', error);
        return false;
    }
}

// 显示页面过渡动画
function showPageTransition() {
    const transition = document.getElementById('pageTransition');
    if (transition) {
        transition.classList.add('active');
    }
}

// 返回项目列表页面
function goBack() {
    showPageTransition();
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 300);
}

// 跳转到编辑页面
function navigateToEdit(projectId) {
    showPageTransition();
    setTimeout(() => {
        window.location.href = 'edit.html?id=' + projectId;
    }, 300);
}

// 从 URL 获取项目 ID
function getProjectIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// 从 localStorage 加载项目数据
function loadProjectsFromStorage() {
    try {
        const stored = localStorage.getItem('projects_cache');
        if (stored) {
            return JSON.parse(stored);
        }
        return [];
    } catch (error) {
        console.error('[Detail] 从localStorage加载失败:', error);
        return [];
    }
}

// 解析项目数据（处理数据库返回的数据格式）
function parseProjectData(project) {
    if (!project) return null;
    
    return {
        id: project.id,
        name: project.name || '',
        brand: project.brand || '',
        category: project.category || '',
        productType: project.product_type || project.productType || '',
        priority: project.priority || '',
        launchDate: project.launch_date || project.launchDate || '',
        status: project.status || '',
        progress: project.progress || '0%',
        images: project.images ? (Array.isArray(project.images) ? project.images : JSON.parse(project.images)) : [],
        remarks: project.remarks ? (Array.isArray(project.remarks) ? project.remarks : JSON.parse(project.remarks)) : [],
        history: project.history ? (Array.isArray(project.history) ? project.history : JSON.parse(project.history)) : [],
        createdAt: project.created_at || project.createdAt || '',
        updatedAt: project.updated_at || project.updatedAt || ''
    };
}

// 从 Supabase 加载项目数据
async function loadProject(projectId) {
    console.log('[Detail] 加载项目:', projectId);
    
    // 先从 localStorage 加载作为备用
    const localProjects = loadProjectsFromStorage();
    const localProject = localProjects.find(p => p.id === projectId);
    
    try {
        // 如果有 Supabase 客户端，尝试从云端加载
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();
            
            if (error) {
                console.warn('[Detail] 从云端加载失败，使用本地数据:', error);
                if (localProject) {
                    return parseProjectData(localProject);
                }
                return null;
            }
            
            console.log('[Detail] 从云端加载成功');
            return parseProjectData(data);
        } else {
            // 没有 Supabase 客户端，使用本地数据
            if (localProject) {
                console.log('[Detail] 使用本地数据');
                return parseProjectData(localProject);
            }
            return null;
        }
    } catch (error) {
        console.error('[Detail] 加载项目异常:', error);
        // 异常时使用本地数据
        if (localProject) {
            return parseProjectData(localProject);
        }
        return null;
    }
}

// 生成修改对比HTML
function generateChangeDiff(oldValue, newValue, fieldName) {
    if (oldValue === newValue) return '';
    
    let html = `<div class="diff-item">`;
    html += `<span class="diff-field">${fieldName}</span>`;
    html += `<div class="diff-content">`;
    
    if (oldValue === undefined || oldValue === null || oldValue === '') {
        // 新增内容
        html += `<span class="diff-add">+ ${newValue}</span>`;
    } else if (newValue === undefined || newValue === null || newValue === '') {
        // 删除内容
        html += `<span class="diff-remove">- ${oldValue}</span>`;
    } else {
        // 修改内容
        html += `<span class="diff-remove">- ${oldValue}</span>`;
        html += `<span class="diff-add">+ ${newValue}</span>`;
    }
    
    html += `</div></div>`;
    return html;
}

// 显示项目详情
function displayProjectDetails(project) {
    if (!project) return;
    
    currentProject = project;
    
    // 设置页面标题
    document.getElementById('projectTitle').textContent = project.name || '项目详情';
    
    // 基本信息
    document.getElementById('detailName').textContent = project.name || '-';
    document.getElementById('detailBrand').textContent = project.brand || '-';
    document.getElementById('detailCategory').textContent = project.category || '-';
    document.getElementById('detailProductType').textContent = project.productType || '-';
    document.getElementById('detailPriority').textContent = project.priority || '-';
    document.getElementById('detailLaunchDate').textContent = project.launchDate || '-';
    document.getElementById('detailCreatedAt').textContent = project.createdAt ? new Date(project.createdAt).toLocaleString('zh-CN') : '-';
    document.getElementById('detailUpdatedAt').textContent = project.updatedAt ? new Date(project.updatedAt).toLocaleString('zh-CN') : '-';
    
    // 状态
    const statusElement = document.getElementById('detailStatus');
    if (statusElement) {
        statusElement.innerHTML = `<span class="detail-status ${project.status || ''}">${project.status || '未设置'}</span>`;
    }
    
    // 进度
    const progress = parseInt(project.progress) || 0;
    const progressFill = document.getElementById('detailProgressFill');
    const progressText = document.getElementById('detailProgressText');
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    if (progressText) {
        progressText.textContent = progress + '%';
    }
    
    // 图片
    const imagesContainer = document.getElementById('detailImages');
    if (imagesContainer) {
        if (project.images && project.images.length > 0) {
            imagesContainer.innerHTML = project.images.map((img, index) => `
                <div class="detail-image-item">
                    <img src="${img}" alt="产品图片 ${index + 1}">
                </div>
            `).join('');
        } else {
            imagesContainer.innerHTML = '<div class="detail-no-image">暂无图片</div>';
        }
    }
    
    // 备注
    const remarksSection = document.getElementById('remarksSection');
    const remarksContainer = document.getElementById('detailRemarks');
    if (remarksSection && remarksContainer) {
        if (project.remarks && project.remarks.length > 0) {
            remarksSection.style.display = 'block';
            remarksContainer.innerHTML = project.remarks.map((r, index) => `
                <div class="detail-remarks-item">
                    <div class="detail-remarks-index">${index + 1}</div>
                    <div class="detail-remarks-content">
                        <div class="detail-remarks-text">${r.text || r}</div>
                        <div class="detail-remarks-time">${r.timestamp ? new Date(r.timestamp).toLocaleString('zh-CN') : ''}</div>
                    </div>
                </div>
            `).join('');
        } else {
            remarksSection.style.display = 'none';
        }
    }
    
    // 修改历史记录
    const historySection = document.getElementById('historySection');
    const historyContainer = document.getElementById('detailHistory');
    if (historySection && historyContainer) {
        if (project.history && project.history.length > 0) {
            historySection.style.display = 'block';
            // 按时间倒序排列
            const sortedHistory = [...project.history].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            
            historyContainer.innerHTML = sortedHistory.map((h, index) => {
                // 计算修改的项数
                let changeCount = 0;
                if (h.changes && typeof h.changes === 'object') {
                    if (h.changes.oldValue && h.changes.newValue) {
                        changeCount = 1;
                    } else if (typeof h.changes === 'object' && !Array.isArray(h.changes)) {
                        changeCount = Object.keys(h.changes).length;
                    }
                }
                
                // 生成字段行
        let fieldsHtml = '';
        const fieldNames = {
            name: '项目名称',
            brand: '品牌',
            category: '项目类型',
            productType: '项目情况',
            priority: '优先级',
            launchDate: '预计上市时间',
            status: '项目状态',
            progress: '完成进度'
        };
                
                // 获取所有需要显示的字段（按固定顺序）
                const allFields = ['name', 'brand', 'category', 'productType', 'priority', 'status', 'progress'];
                
                // 获取旧数据（用于对比）
                let oldData = {};
                if (index < sortedHistory.length - 1) {
                    // 尝试从之前的历史记录获取旧值
                    const prevHistory = sortedHistory[index + 1];
                    if (prevHistory.changes) {
                        oldData = prevHistory.changes;
                    }
                }
                
                // 如果是创建操作，使用空值作为旧值
                if (h.action === '创建') {
                    oldData = {};
                }
                
                // 生成每个字段的HTML
                allFields.forEach(key => {
                    const fieldName = fieldNames[key] || key;
                    const oldValue = oldData[key] || '';
                    const newValue = h.changes && h.changes[key] !== undefined ? h.changes[key] : '';
                    
                    // 判断是否有修改
                    const isChanged = oldValue !== newValue && (oldValue || newValue);
                    
                    fieldsHtml += `
                        <div class="history-field ${isChanged ? 'changed' : ''}">
                            <span class="field-label">${fieldName}</span>
                            <span class="field-value">
                                ${isChanged ? `
                                    <span class="old-value">${oldValue || '-'}</span>
                                    <span class="arrow">→</span>
                                    <span class="new-value">${newValue || '-'}</span>
                                ` : (newValue || '-')}
                            </span>
                        </div>
                    `;
                });
                
                return `
                    <div class="history-card">
                        <div class="history-header">
                            <div class="history-time">${new Date(h.timestamp).toLocaleString('zh-CN')}</div>
                            <div class="history-badge">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 20h9"/>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                </svg>
                                ${h.action || '更新项目'}
                            </div>
                        </div>
                        <div class="history-fields">${fieldsHtml}</div>
                        <div class="history-footer">
                            <span class="change-count">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                </svg>
                                本次修改了 ${changeCount} 项内容
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            historySection.style.display = 'block';
            historyContainer.innerHTML = '<div class="history-empty">暂无修改记录</div>';
        }
    }
    
    console.log('[Detail] 项目详情显示完成');
}

// 页面初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('[Detail] 页面加载完成');
    
    // 初始化 Supabase
    await initSupabaseClient();
    
    // 获取项目ID
    const projectId = getProjectIdFromUrl();
    if (!projectId) {
        alert('未找到项目ID');
        goBack();
        return;
    }
    
    // 加载项目数据
    const project = await loadProject(projectId);
    if (!project) {
        alert('加载项目失败，请返回重试');
        goBack();
        return;
    }
    
    // 显示项目详情
    displayProjectDetails(project);
    
    // 绑定事件
    const backBtn = document.getElementById('cancelBtn');
    if (backBtn) {
        backBtn.addEventListener('click', goBack);
    }
    
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => navigateToEdit(projectId));
    }
    
    console.log('[Detail] 页面初始化完成');
});