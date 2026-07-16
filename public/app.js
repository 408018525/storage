const app = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');
const modalRoot = document.querySelector('#modal-root');
const state = {
  config: null,
  me: null,
  turnstilePromise: null,
  widgetId: null,
  adminSettings: null,
  users: [],
};

const statusText = {
  pending: '待审核', processing: '处理中', approved: '已批准', rejected: '已拒绝',
  revoking: '撤销中', revoked: '已撤销', error: '错误', active: '启用', disabled: '禁用', deleted: '已删除',
};

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}
function attr(value) { return esc(value).replace(/`/g, '&#96;'); }
function fmtDate(value) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T') + (String(value).includes('Z') ? '' : 'Z'));
  return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleString('zh-CN', { hour12: false });
}
function badge(status) { return `<span class="badge ${esc(status)}">${esc(statusText[status] || status)}</span>`; }
function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
function closeModal() { modalRoot.innerHTML = ''; }
function openModal(title, content, large = false) {
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal ${large ? 'large' : ''}">
    <div class="modal-header"><h3>${esc(title)}</h3><button class="btn btn-ghost btn-sm" data-close-modal>关闭</button></div>${content}</div></div>`;
  modalRoot.querySelector('[data-close-modal]').addEventListener('click', closeModal);
  modalRoot.querySelector('.modal-backdrop').addEventListener('click', e => { if (e.target.classList.contains('modal-backdrop')) closeModal(); });
}

async function api(path, options = {}) {
  const opts = { method: options.method || 'GET', headers: { ...(options.headers || {}) }, credentials: 'same-origin' };
  if (options.body instanceof FormData) opts.body = options.body;
  else if (options.body !== undefined) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(options.body);
  }
  const response = await fetch(path, opts);
  let data;
  try { data = await response.json(); } catch { data = { ok: false, message: `HTTP ${response.status}` }; }
  if (!response.ok || data.ok === false) {
    const error = new Error(data.message || '请求失败');
    error.code = data.code;
    error.details = data.details;
    throw error;
  }
  return data;
}

function applyTheme() {
  const site = state.config?.site || {};
  document.documentElement.style.setProperty('--accent', site.accent || '#5b5ce2');
  document.documentElement.style.setProperty('--accent-2', site.accent2 || '#8b5cf6');
  document.documentElement.style.setProperty('--bg-overlay', String(site.backgroundOverlay ?? .08));
  const bg = document.querySelector('#background-layer');
  if (site.backgroundType === 'image') bg.style.backgroundImage = `url("${String(site.backgroundValue || '').replace(/["\\]/g, '')}")`;
  else bg.style.background = site.backgroundValue || 'linear-gradient(135deg,#eef2ff,#f8fafc,#f5f3ff)';
  document.title = site.title || '中文二级域名申请中心';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', site.accent || '#5b5ce2');
}

async function init() {
  try {
    const [{ config }, me] = await Promise.all([api('/api/public/config'), api('/api/auth/me')]);
    state.config = config;
    state.me = me.user;
    applyTheme();
    maybeShowPopup();
    await route();
  } catch (error) {
    app.innerHTML = `<div class="loading-screen"><h2>应用加载失败</h2><p>${esc(error.message)}</p><button class="btn btn-primary" id="retry">重试</button></div>`;
    document.querySelector('#retry')?.addEventListener('click', () => location.reload());
  }
}

function maybeShowPopup() {
  const popup = state.config?.popup;
  if (!popup?.enabled || !popup.content) return;
  const key = 'portal-popup-shown';
  if (popup.oncePerSession && sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  openModal(popup.title || '网站公告', `<div style="white-space:pre-wrap;line-height:1.8">${esc(popup.content)}</div>`);
}

function go(hash) { location.hash = hash; }
window.addEventListener('hashchange', route);

async function route() {
  const hash = location.hash || (state.me ? '#/apply' : '#/login');
  if (state.config?.needsBootstrap && hash !== '#/setup') return go('#/setup');
  if (!state.me && !['#/login', '#/register', '#/setup'].includes(hash)) return go('#/login');
  if (state.me && ['#/login', '#/register', '#/setup'].includes(hash)) return go('#/apply');

  const routes = {
    '#/setup': renderSetup,
    '#/login': renderLogin,
    '#/register': renderRegister,
    '#/apply': renderApply,
    '#/applications': renderMyApplications,
    '#/account': renderAccount,
    '#/admin': renderAdminOverview,
    '#/admin/applications': renderAdminApplications,
    '#/admin/users': renderAdminUsers,
    '#/admin/settings': renderAdminSettings,
    '#/admin/analytics': renderAdminAnalytics,
    '#/admin/audit': renderAdminAudit,
  };
  const fn = routes[hash] || (state.me ? renderApply : renderLogin);
  if (hash.startsWith('#/admin') && state.me?.role !== 'admin') return go('#/apply');
  state.widgetId = null;
  await fn();
}

function authTemplate(title, subtitle, formHtml) {
  const site = state.config?.site || {};
  return `<div class="auth-shell">
    <section class="auth-brand"><div class="brand-mark">域</div><h1>${esc(site.title || '中文二级域名申请中心')}</h1><p>${esc(site.subtitle || '')}</p></section>
    <section class="auth-panel"><div class="auth-card"><h2>${esc(title)}</h2><p class="sub">${esc(subtitle)}</p>${formHtml}</div></section>
  </div>`;
}

async function renderSetup() {
  app.innerHTML = authTemplate('初始化管理员', '系统首次部署，需要用 Worker Secret 中的初始化令牌创建第一个管理员。', `
    <form id="setup-form" class="form-grid">
      <div class="form-group full"><label>初始化令牌</label><input name="setupToken" type="password" required autocomplete="off"></div>
      <div class="form-group"><label>管理员用户名</label><input name="username" required minlength="3" maxlength="32" autocomplete="username"></div>
      <div class="form-group"><label>邮箱</label><input name="email" type="email" autocomplete="email"></div>
      <div class="form-group full"><label>管理员密码</label><input name="password" type="password" required minlength="10" autocomplete="new-password"><span class="help">至少 10 位，并包含字母和数字。</span></div>
      <div class="form-group full"><button class="btn btn-primary" type="submit">创建管理员并登录</button></div>
    </form>`);
  document.querySelector('#setup-form').addEventListener('submit', async e => {
    e.preventDefault(); const button = e.submitter; button.disabled = true;
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try { const result = await api('/api/setup/bootstrap', { method:'POST', body }); state.me = result.user; state.config.needsBootstrap = false; toast('管理员创建成功', 'success'); go('#/admin/settings'); }
    catch (error) { toast(error.message, 'error'); button.disabled = false; }
  });
}

async function renderLogin() {
  const turn = state.config.turnstile;
  app.innerHTML = authTemplate('登录', '使用您的账户进入域名申请中心。', `
    <form id="login-form" class="form-grid">
      <div class="form-group full"><label>用户名或邮箱</label><input name="identity" required autocomplete="username"></div>
      <div class="form-group full"><label>密码</label><input name="password" type="password" required autocomplete="current-password"></div>
      <div class="form-group full"><label class="checkbox"><input name="remember" type="checkbox">30 天内保持登录</label></div>
      ${turn.enabledLogin ? '<div class="form-group full"><div id="turnstile-box"></div></div>' : ''}
      <div class="form-group full"><button class="btn btn-primary" type="submit">登录</button></div>
    </form>
    <p class="muted" style="text-align:center">没有账户？ <a href="#/register" style="color:var(--accent);font-weight:700">注册</a></p>`);
  if (turn.enabledLogin) await mountTurnstile('#turnstile-box', turn.actionLogin);
  document.querySelector('#login-form').addEventListener('submit', async e => {
    e.preventDefault(); const button = e.submitter; button.disabled = true;
    const form = new FormData(e.currentTarget);
    const body = { identity: form.get('identity'), password: form.get('password'), remember: form.get('remember') === 'on', turnstileToken: turnstileToken() };
    try { const result = await api('/api/auth/login', { method:'POST', body }); state.me = result.user; toast('登录成功', 'success'); go(result.user.role === 'admin' ? '#/admin' : '#/apply'); }
    catch (error) { toast(error.message, 'error'); resetTurnstile(); button.disabled = false; }
  });
}

async function renderRegister() {
  if (!state.config.registration.enabled) {
    app.innerHTML = authTemplate('注册已关闭', '管理员当前未开放自助注册。', `<a class="btn btn-primary" href="#/login">返回登录</a>`); return;
  }
  const turn = state.config.turnstile;
  app.innerHTML = authTemplate('创建账户', '注册后即可提交中文二级域名申请。', `
    <form id="register-form" class="form-grid">
      <div class="form-group"><label>用户名</label><input name="username" required minlength="3" maxlength="32" autocomplete="username"></div>
      <div class="form-group"><label>邮箱</label><input name="email" type="email" autocomplete="email"></div>
      <div class="form-group full"><label>密码</label><input name="password" type="password" required minlength="10" autocomplete="new-password"><span class="help">至少 10 位，并包含字母和数字。</span></div>
      ${state.config.registration.requireKey ? '<div class="form-group full"><label>注册密钥</label><input name="registrationKey" required autocomplete="off"></div>' : ''}
      ${turn.enabledRegister ? '<div class="form-group full"><div id="turnstile-box"></div></div>' : ''}
      <div class="form-group full"><button class="btn btn-primary" type="submit">注册</button></div>
    </form>
    <p class="muted" style="text-align:center">已有账户？ <a href="#/login" style="color:var(--accent);font-weight:700">登录</a></p>`);
  if (turn.enabledRegister) await mountTurnstile('#turnstile-box', turn.actionRegister);
  document.querySelector('#register-form').addEventListener('submit', async e => {
    e.preventDefault(); const button = e.submitter; button.disabled = true;
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form); body.turnstileToken = turnstileToken();
    try {
      const result = await api('/api/auth/register', { method:'POST', body });
      if (result.pendingActivation) { toast('注册成功，请等待管理员启用账户', 'success'); go('#/login'); }
      else { state.me = result.user; toast('注册成功', 'success'); go('#/apply'); }
    } catch (error) { toast(error.message, 'error'); resetTurnstile(); button.disabled = false; }
  });
}

function navLink(hash, icon, text) { return `<a class="nav-link ${location.hash === hash ? 'active' : ''}" href="${hash}"><span class="icon">${icon}</span>${esc(text)}</a>`; }
function shell(title, content) {
  const site = state.config.site || {};
  const isAdmin = state.me?.role === 'admin';
  const announcement = state.config.announcement?.enabled && state.config.announcement.text
    ? `<div class="announcement ${esc(state.config.announcement.level)}">${esc(state.config.announcement.text)}</div>` : '';
  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand"><div class="sidebar-logo">${site.logoUrl ? `<img src="${attr(site.logoUrl)}" alt="">` : '域'}</div><span>${esc(site.title || '域名申请中心')}</span></div>
      <nav><div class="nav-section"><div class="nav-label">申请服务</div>
        ${navLink('#/apply','＋','申请域名')}${navLink('#/applications','▤','我的申请')}${navLink('#/account','⚙','账户设置')}
      </div>${isAdmin ? `<div class="nav-section"><div class="nav-label">管理后台</div>
        ${navLink('#/admin','▦','管理概览')}${navLink('#/admin/applications','✓','申请审核')}${navLink('#/admin/users','♟','用户管理')}${navLink('#/admin/settings','⚙','系统设置')}${navLink('#/admin/analytics','↗','数据分析')}${navLink('#/admin/audit','≡','审计日志')}
      </div>` : ''}</nav>
      <div class="sidebar-footer"><div class="user-mini"><strong>${esc(state.me.username)}</strong><small>${isAdmin ? '管理员' : '普通用户'}</small></div><button class="btn btn-ghost" id="logout" style="color:#cbd5e1;width:100%">退出登录</button></div>
    </aside>
    <main class="main-wrap"><header class="topbar"><div class="actions"><button class="btn btn-secondary mobile-menu" id="menu">☰</button><h1>${esc(title)}</h1></div><div class="top-actions">${badge(state.me.status || 'active')}</div></header>
      <div class="content">${announcement}${content}<p class="muted" style="text-align:center;margin-top:34px">${esc(site.footer || '')}</p></div></main>
  </div>`;
  document.querySelector('#menu')?.addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
  document.querySelector('#logout')?.addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method:'POST', body:{} }); } catch {}
    state.me = null; go('#/login');
  });
}

async function renderApply() {
  const suffixes = state.config.suffixes || [];
  const suffixOptions = suffixes.map(s => `<option value="${attr(s.suffix)}">${esc(s.label)} — .${esc(s.suffix)}</option>`).join('');
  shell('申请中文二级域名', `<div class="grid grid-2">
    <section class="card"><h2>创建申请</h2><p class="muted">每条申请可以填写不同的 DNS 目标；管理员审核通过后才会创建记录。</p>
      ${suffixes.length ? `<form id="apply-form">
        <div class="domain-builder"><div class="form-group"><label>域名前缀</label><input id="prefix" name="prefix" placeholder="例如：我的主页" maxlength="32" required></div><span class="domain-dot">.</span>
          <div class="form-group"><label>域名后缀</label><select id="suffix" name="suffix" required>${suffixOptions}</select></div></div>
        <div class="form-grid" style="margin-top:18px">
          <div class="form-group"><label>DNS 记录类型</label><select id="record-type" name="recordType" required></select></div>
          <div class="form-group"><label>目标地址</label><input id="dns-target" name="target" required maxlength="253" autocomplete="off"></div>
          <div class="form-group full"><p class="help" id="target-help"></p></div>
        </div>
        <div class="domain-preview"><span class="muted">申请预览</span><strong id="unicode-preview">—</strong><code id="ascii-preview">Punycode：—</code><code id="dns-preview">DNS：—</code></div>
        ${state.config.turnstile.enabledApply ? '<div style="margin:20px 0"><div id="turnstile-box"></div></div>' : ''}
        <button class="btn btn-primary" type="submit">提交申请</button>
      </form>` : `<div class="empty">管理员尚未配置可申请的域名后缀。</div>`}
    </section>
    <section class="card"><h2>填写规则</h2><div class="announcement info"><strong>CNAME</strong><br>填写主机名，例如：user.pages.dev。不要填写 https://、端口或路径。</div>
      <div class="announcement info"><strong>A</strong><br>填写公开 IPv4 地址。</div><div class="announcement info"><strong>AAAA</strong><br>填写公开 IPv6 地址。</div>
      <p class="help">本地、私有、保留 IP 会被拒绝。目标地址会显示给管理员审核。</p>
      <h2 style="margin-top:26px">账户权限</h2><div class="grid grid-2">
      <div class="stat-card"><div class="label">可申请</div><div class="value">${state.me.role === 'admin' || state.me.permissions.canApply ? '是' : '否'}</div></div>
      <div class="stat-card"><div class="label">待审上限</div><div class="value">${state.me.role === 'admin' ? '不限' : esc(state.me.permissions.maxPending)}</div></div>
      <div class="stat-card"><div class="label">总数上限</div><div class="value">${state.me.role === 'admin' ? '不限' : esc(state.me.permissions.maxTotal)}</div></div>
      <div class="stat-card"><div class="label">允许后缀</div><div class="value" style="font-size:17px">${state.me.role === 'admin' || !state.me.permissions.allowedSuffixes.length ? '全部' : esc(state.me.permissions.allowedSuffixes.join('、'))}</div></div>
    </div><p class="help">提交只会进入审核队列；管理员批准后才会写入 DNS。</p></section>
  </div>`);
  if (!suffixes.length) return;

  const suffixSelect = document.querySelector('#suffix');
  const typeSelect = document.querySelector('#record-type');
  const targetInput = document.querySelector('#dns-target');
  const targetHelp = document.querySelector('#target-help');
  const selectedSuffix = () => suffixes.find(s => s.suffix === suffixSelect.value) || suffixes[0];
  const updateTypeOptions = () => {
    const config = selectedSuffix();
    const types = config.allowedTypes?.length ? config.allowedTypes : ['CNAME'];
    const current = typeSelect.value;
    typeSelect.innerHTML = types.map(type => `<option value="${attr(type)}">${esc(type)}</option>`).join('');
    typeSelect.value = types.includes(current) ? current : (types.includes(config.defaultType) ? config.defaultType : types[0]);
    updateTargetHelp();
  };
  const updateTargetHelp = () => {
    const type = typeSelect.value;
    const hints = {
      CNAME: ['例如：username.pages.dev', '只填写完整主机名，不要带 https://、端口或路径。'],
      A: ['例如：8.8.8.8', '填写公开 IPv4 地址；私有和本地地址不允许。'],
      AAAA: ['例如：2606:4700:4700::1111', '填写公开 IPv6 地址；本地和私有地址不允许。'],
    };
    const [placeholder, help] = hints[type] || hints.CNAME;
    targetInput.placeholder = placeholder;
    targetHelp.textContent = help;
    updatePreview();
  };
  const updatePreview = () => {
    const prefix = document.querySelector('#prefix').value.trim();
    const suffix = suffixSelect.value;
    document.querySelector('#unicode-preview').textContent = prefix ? `${prefix}.${suffix}` : '—';
    let ascii = '—';
    if (prefix) { try { ascii = new URL(`https://${prefix}.${suffix}`).hostname; } catch { ascii = '输入格式暂不可转换'; } }
    document.querySelector('#ascii-preview').textContent = `Punycode：${ascii}`;
    const target = targetInput.value.trim() || '—';
    document.querySelector('#dns-preview').textContent = `DNS：${typeSelect.value || '—'} → ${target}`;
  };
  document.querySelector('#prefix').addEventListener('input', updatePreview);
  suffixSelect.addEventListener('change', () => { updateTypeOptions(); updatePreview(); });
  typeSelect.addEventListener('change', updateTargetHelp);
  targetInput.addEventListener('input', updatePreview);
  updateTypeOptions();
  updatePreview();
  if (state.config.turnstile.enabledApply) await mountTurnstile('#turnstile-box', state.config.turnstile.actionApply);
  document.querySelector('#apply-form').addEventListener('submit', async e => {
    e.preventDefault(); const button = e.submitter; button.disabled = true;
    const form = new FormData(e.currentTarget);
    try {
      await api('/api/applications', { method:'POST', body:{
        prefix:form.get('prefix'), suffix:form.get('suffix'), recordType:form.get('recordType'),
        target:form.get('target'), turnstileToken:turnstileToken()
      } });
      toast('申请已提交，等待管理员审核', 'success'); go('#/applications');
    } catch (error) { toast(error.message, 'error'); resetTurnstile(); button.disabled = false; }
  });
}

async function renderMyApplications() {
  shell('我的申请', `<section class="card"><div class="empty"><div class="spinner"></div><p>正在读取申请记录…</p></div></section>`);
  try {
    const { applications } = await api('/api/applications');
    const rows = applications.map(a => `<tr><td><strong>${esc(a.fqdnUnicode)}</strong><br><small class="mono muted">${esc(a.fqdnAscii)}</small></td><td>${esc(a.recordType)} → <span class="mono">${esc(a.recordContent)}</span></td><td>${badge(a.status)}</td><td>${fmtDate(a.createdAt)}</td><td>${a.reviewNote ? esc(a.reviewNote) : '—'}${a.errorMessage ? `<br><small style="color:var(--danger)">${esc(a.errorMessage)}</small>` : ''}</td></tr>`).join('');
    shell('我的申请', `<section class="card"><div class="actions" style="justify-content:space-between;margin-bottom:18px"><div><h2 style="margin:0">申请记录</h2><p class="muted" style="margin:5px 0 0">查看审核状态与管理员备注。</p></div><a class="btn btn-primary" href="#/apply">新申请</a></div>
      ${rows ? `<div class="table-wrap"><table><thead><tr><th>域名</th><th>DNS 目标</th><th>状态</th><th>提交时间</th><th>备注</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty">暂无申请记录。</div>'}</section>`);
  } catch (error) { toast(error.message, 'error'); }
}

async function renderAccount() {
  shell('账户设置', `<div class="grid grid-2"><section class="card"><h2>账户信息</h2><div class="form-grid"><div class="form-group"><label>用户名</label><input value="${attr(state.me.username)}" disabled></div><div class="form-group"><label>角色</label><input value="${state.me.role === 'admin' ? '管理员' : '普通用户'}" disabled></div><div class="form-group full"><label>邮箱</label><input value="${attr(state.me.email || '')}" disabled></div></div></section>
    <section class="card"><h2>修改密码</h2><form id="password-form" class="form-grid"><div class="form-group full"><label>当前密码</label><input name="currentPassword" type="password" required></div><div class="form-group full"><label>新密码</label><input name="newPassword" type="password" required minlength="10"></div><div class="form-group full"><button class="btn btn-primary" type="submit">修改并退出所有会话</button></div></form></section></div>`);
  document.querySelector('#password-form').addEventListener('submit', async e => {
    e.preventDefault(); const button = e.submitter; button.disabled = true; const body = Object.fromEntries(new FormData(e.currentTarget));
    try { await api('/api/auth/change-password', { method:'POST', body }); toast('密码已修改，请重新登录', 'success'); state.me = null; go('#/login'); }
    catch (error) { toast(error.message, 'error'); button.disabled = false; }
  });
}

async function renderAdminOverview() {
  shell('管理概览', `<div class="loading-screen" style="min-height:55vh"><div class="spinner"></div><p>正在统计…</p></div>`);
  try {
    const { overview } = await api('/api/admin/overview');
    const u = overview.users || {}, a = overview.applications || {};
    const recent = (overview.recent || []).map(x => `<tr><td>${esc(x.username)}</td><td><strong>${esc(x.fqdn_unicode)}</strong></td><td>${badge(x.status)}</td><td>${fmtDate(x.created_at)}</td></tr>`).join('');
    shell('管理概览', `<div class="grid grid-4">
      ${stat('用户总数',u.total || 0,'活跃 '+(u.active || 0))}${stat('待审核',a.pending || 0,'需要处理')}${stat('已批准',a.approved || 0,'DNS 已创建')}${stat('今日申请',overview.today || 0,'今日新增')}
    </div><section class="card"><div class="actions" style="justify-content:space-between"><div><h2 style="margin:0">最新申请</h2><p class="muted">最近提交的 8 条申请</p></div><a class="btn btn-secondary" href="#/admin/applications">查看全部</a></div>
    ${recent ? `<div class="table-wrap"><table><thead><tr><th>用户</th><th>域名</th><th>状态</th><th>时间</th></tr></thead><tbody>${recent}</tbody></table></div>` : '<div class="empty">暂无申请。</div>'}</section>`);
  } catch (error) { toast(error.message,'error'); }
}
function stat(label, value, trend) { return `<section class="card stat-card"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="trend">${esc(trend)}</div></section>`; }

async function renderAdminApplications() {
  shell('申请审核', `<section class="card"><div class="empty"><div class="spinner"></div></div></section>`);
  try {
    const { applications } = await api('/api/admin/applications?limit=300');
    const filters = ['all','pending','approved','rejected','revoked'].map(s => `<button class="tab ${s==='all'?'active':''}" data-filter="${s}">${s==='all'?'全部':statusText[s]}</button>`).join('');
    shell('申请审核', `<section class="card"><div class="actions" style="justify-content:space-between;margin-bottom:18px"><div class="tabs" id="app-filters">${filters}</div><input id="app-search" placeholder="搜索域名或用户名" style="max-width:280px"></div><div id="applications-table"></div></section>`);
    const draw = (filter='all', q='') => {
      const list = applications.filter(a => (filter==='all'||a.status===filter) && (!q || `${a.fqdnUnicode} ${a.fqdnAscii} ${a.username}`.toLowerCase().includes(q.toLowerCase())));
      document.querySelector('#applications-table').innerHTML = list.length ? `<div class="table-wrap"><table><thead><tr><th>用户</th><th>域名</th><th>DNS</th><th>状态</th><th>提交时间</th><th>操作</th></tr></thead><tbody>${list.map(a => `<tr>
        <td>${esc(a.username)}</td><td><strong>${esc(a.fqdnUnicode)}</strong><br><small class="mono muted">${esc(a.fqdnAscii)}</small>${a.errorMessage?`<br><small style="color:var(--danger)">${esc(a.errorMessage)}</small>`:''}</td>
        <td>${esc(a.recordType)} → <span class="mono">${esc(a.recordContent)}</span></td><td>${badge(a.status)}</td><td>${fmtDate(a.createdAt)}</td>
        <td><div class="actions">${a.status==='pending'?`<button class="btn btn-success btn-sm" data-review="approve" data-id="${a.id}">批准</button><button class="btn btn-danger btn-sm" data-review="reject" data-id="${a.id}">拒绝</button>`:''}${a.status==='approved'?`<button class="btn btn-warning btn-sm" data-review="revoke" data-id="${a.id}">撤销 DNS</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">没有匹配记录。</div>';
      bindReviewButtons();
    };
    draw();
    document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); draw(btn.dataset.filter, document.querySelector('#app-search').value);
    }));
    document.querySelector('#app-search').addEventListener('input', e => draw(document.querySelector('[data-filter].active').dataset.filter, e.target.value));
  } catch (error) { toast(error.message,'error'); }
}
function bindReviewButtons() {
  document.querySelectorAll('[data-review]').forEach(btn => btn.addEventListener('click', async () => {
    const action = btn.dataset.review; const labels = {approve:'批准',reject:'拒绝',revoke:'撤销'};
    if (!confirm(`确认${labels[action]}该申请？`)) return;
    const note = prompt('管理员备注（可留空）','') ?? '';
    btn.disabled = true;
    try { await api(`/api/admin/applications/${btn.dataset.id}/${action}`, {method:'POST',body:{note}}); toast(`操作成功：${labels[action]}`,'success'); await renderAdminApplications(); }
    catch (error) { toast(error.message,'error'); btn.disabled=false; }
  }));
}

async function renderAdminUsers() {
  shell('用户管理', `<section class="card"><div class="empty"><div class="spinner"></div></div></section>`);
  try {
    const { users } = await api('/api/admin/users'); state.users = users;
    const rows = users.map(u => `<tr><td><strong>${esc(u.username)}</strong><br><small class="muted">${esc(u.email||'未填写邮箱')}</small></td><td>${u.role==='admin'?'管理员':'用户'}</td><td>${badge(u.status)}</td><td>${u.applicationCount} / ${u.approvedCount}</td><td>${fmtDate(u.lastLoginAt)}</td><td><div class="actions"><button class="btn btn-secondary btn-sm" data-edit-user="${u.id}">权限</button><button class="btn btn-secondary btn-sm" data-reset-user="${u.id}">重置密码</button>${u.id!==state.me.id?`<button class="btn btn-danger btn-sm" data-delete-user="${u.id}">移除</button>`:''}</div></td></tr>`).join('');
    shell('用户管理', `<section class="card"><div class="actions" style="justify-content:space-between;margin-bottom:18px"><div><h2 style="margin:0">用户数据</h2><p class="muted">管理账户状态、角色和域名申请权限。</p></div><button class="btn btn-primary" id="add-user">添加用户</button></div><div class="table-wrap"><table><thead><tr><th>用户</th><th>角色</th><th>状态</th><th>申请/批准</th><th>最后登录</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div></section>`);
    document.querySelector('#add-user').addEventListener('click', showAddUser);
    document.querySelectorAll('[data-edit-user]').forEach(b=>b.addEventListener('click',()=>showUserEditor(users.find(u=>u.id===b.dataset.editUser))));
    document.querySelectorAll('[data-reset-user]').forEach(b=>b.addEventListener('click',()=>resetUserPassword(b.dataset.resetUser)));
    document.querySelectorAll('[data-delete-user]').forEach(b=>b.addEventListener('click',()=>deleteUser(b.dataset.deleteUser)));
  } catch (error) { toast(error.message,'error'); }
}
function permissionFields(p={}) { return `<div class="form-group"><label class="checkbox"><input name="canApply" type="checkbox" ${p.canApply!==false?'checked':''}>允许申请域名</label></div><div class="form-group"><label>待审上限</label><input name="maxPending" type="number" min="0" max="100" value="${attr(p.maxPending??3)}"></div><div class="form-group"><label>总数上限</label><input name="maxTotal" type="number" min="0" max="1000" value="${attr(p.maxTotal??20)}"></div><div class="form-group full"><label>允许后缀</label><input name="allowedSuffixes" value="${attr((p.allowedSuffixes||[]).join(','))}" placeholder="留空表示全部；多个后缀用逗号分隔"></div>`; }
function showAddUser() {
  openModal('添加用户', `<form id="add-user-form" class="form-grid"><div class="form-group"><label>用户名</label><input name="username" required></div><div class="form-group"><label>邮箱</label><input name="email" type="email"></div><div class="form-group full"><label>初始密码</label><input name="password" type="password" minlength="10" required></div><div class="form-group"><label>角色</label><select name="role"><option value="user">用户</option><option value="admin">管理员</option></select></div><div class="form-group"><label>状态</label><select name="status"><option value="active">启用</option><option value="disabled">禁用</option></select></div>${permissionFields()}<div class="form-group full"><button class="btn btn-primary" type="submit">创建用户</button></div></form>`);
  document.querySelector('#add-user-form').addEventListener('submit', async e => { e.preventDefault(); const f=new FormData(e.currentTarget); const body=Object.fromEntries(f); body.permissions={canApply:f.get('canApply')==='on',maxPending:f.get('maxPending'),maxTotal:f.get('maxTotal'),allowedSuffixes:String(f.get('allowedSuffixes')||'').split(',')}; try{await api('/api/admin/users',{method:'POST',body});closeModal();toast('用户已创建','success');renderAdminUsers();}catch(error){toast(error.message,'error');} });
}
function showUserEditor(user) {
  openModal(`编辑权限：${user.username}`, `<form id="edit-user-form" class="form-grid"><div class="form-group"><label>角色</label><select name="role"><option value="user" ${user.role==='user'?'selected':''}>用户</option><option value="admin" ${user.role==='admin'?'selected':''}>管理员</option></select></div><div class="form-group"><label>状态</label><select name="status"><option value="active" ${user.status==='active'?'selected':''}>启用</option><option value="disabled" ${user.status==='disabled'?'selected':''}>禁用</option></select></div>${permissionFields(user.permissions)}<div class="form-group full"><button class="btn btn-primary" type="submit">保存权限</button></div></form>`);
  document.querySelector('#edit-user-form').addEventListener('submit', async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const body={role:f.get('role'),status:f.get('status'),permissions:{canApply:f.get('canApply')==='on',maxPending:f.get('maxPending'),maxTotal:f.get('maxTotal'),allowedSuffixes:String(f.get('allowedSuffixes')||'').split(',')}};try{await api(`/api/admin/users/${user.id}`,{method:'PATCH',body});closeModal();toast('用户权限已更新','success');renderAdminUsers();}catch(error){toast(error.message,'error');}});
}
async function resetUserPassword(id) { const password=prompt('输入新密码（至少10位，包含字母和数字）'); if(!password)return; try{await api(`/api/admin/users/${id}/reset-password`,{method:'POST',body:{password}});toast('密码已重置，用户现有会话已失效','success');}catch(error){toast(error.message,'error');} }
async function deleteUser(id) { if(!confirm('确认移除该用户？账户将被禁用并清除会话。'))return; try{await api(`/api/admin/users/${id}`,{method:'DELETE'});toast('用户已移除','success');renderAdminUsers();}catch(error){toast(error.message,'error');} }

async function renderAdminSettings() {
  shell('系统设置', `<section class="card"><div class="empty"><div class="spinner"></div><p>正在读取配置…</p></div></section>`);
  try {
    const [{ settings }, keysResult] = await Promise.all([api('/api/admin/settings'), api('/api/admin/registration-keys')]);
    state.adminSettings = settings;
    shell('系统设置', `<section class="card"><div class="tabs" id="settings-tabs">
      ${['site:界面','turnstile:Turnstile','dns:DNS 后缀','registration:注册与密钥','notice:公告弹窗','security:账户安全'].map((x,i)=>{const[k,n]=x.split(':');return `<button class="tab ${i===0?'active':''}" data-tab="${k}">${n}</button>`}).join('')}
    </div>${siteSettings(settings)}${turnstileSettings(settings)}${dnsSettings(settings)}${registrationSettings(settings,keysResult.keys||[])}${noticeSettings(settings)}${securitySettings()}</section>`);
    bindSettingsEvents();
  } catch (error) { toast(error.message,'error'); }
}
function siteSettings(s) { return `<div class="setting-section active" data-section="site"><h2>界面与背景</h2><form id="site-form" class="form-grid"><div class="form-group"><label>网站标题</label><input name="title" value="${attr(s.site.title)}"></div><div class="form-group"><label>副标题</label><input name="subtitle" value="${attr(s.site.subtitle)}"></div><div class="form-group"><label>Logo URL</label><input name="logoUrl" value="${attr(s.site.logoUrl)}"></div><div class="form-group"><label>页脚文字</label><input name="footer" value="${attr(s.site.footer)}"></div><div class="form-group"><label>主色</label><input name="accent" type="color" value="${attr(s.site.accent)}"></div><div class="form-group"><label>辅助色</label><input name="accent2" type="color" value="${attr(s.site.accent2)}"></div><div class="form-group"><label>背景类型</label><select name="backgroundType"><option value="gradient" ${s.site.backgroundType==='gradient'?'selected':''}>渐变/CSS</option><option value="image" ${s.site.backgroundType==='image'?'selected':''}>图片 URL</option><option value="solid" ${s.site.backgroundType==='solid'?'selected':''}>纯色</option></select></div><div class="form-group"><label>背景遮罩 0–0.9</label><input name="backgroundOverlay" type="number" min="0" max="0.9" step="0.01" value="${attr(s.site.backgroundOverlay)}"></div><div class="form-group full"><label>背景值</label><input id="background-value" name="backgroundValue" value="${attr(s.site.backgroundValue)}"><span class="help">图片模式填 URL；渐变模式可填 linear-gradient(...); 纯色填颜色。</span></div><div class="form-group full"><button class="btn btn-primary" type="submit">保存界面</button></div></form></div>`; }
function turnstileSettings(s) {
  const t=s.turnstile;
  if (t.envManaged) return `<div class="setting-section" data-section="turnstile"><h2>Turnstile 人机验证</h2><div class="announcement info"><strong>当前由 Cloudflare Workers 环境变量管理</strong><br>请到 Worker → 设置 → 变量和机密中修改。后台不会显示或保存 Secret。</div><div class="table-wrap"><table style="min-width:620px"><tbody><tr><th>Site Key</th><td class="mono">${esc(t.siteKey||'未配置')}</td></tr><tr><th>Secret</th><td>${esc(t.secretSource==='worker-secret'?'已配置为 Worker Secret':'未配置')}</td></tr><tr><th>预期主机名</th><td class="mono">${esc(t.expectedHostname||'未限制')}</td></tr><tr><th>申请验证</th><td>${t.enabledApply?'开启':'关闭'} / ${esc(t.actionApply)}</td></tr><tr><th>登录验证</th><td>${t.enabledLogin?'开启':'关闭'} / ${esc(t.actionLogin)}</td></tr><tr><th>注册验证</th><td>${t.enabledRegister?'开启':'关闭'} / ${esc(t.actionRegister)}</td></tr></tbody></table></div><p class="help">变量名：TURNSTILE_SITE_KEY、TURNSTILE_EXPECTED_HOSTNAME、TURNSTILE_ENABLE_*、TURNSTILE_ACTION_*；机密名：TURNSTILE_SECRET。</p></div>`;
  return `<div class="setting-section" data-section="turnstile"><h2>Turnstile 人机验证</h2><p class="secret-state">Secret 来源：${esc(t.secretSource)}；主加密密钥：${s.masterKeyReady?'已配置':'未配置'}</p><form id="turnstile-form" class="form-grid"><div class="form-group"><label>站点密钥 Site Key</label><input name="siteKey" value="${attr(t.siteKey)}"></div><div class="form-group"><label>Secret Key</label><input name="secret" type="password" placeholder="${attr(t.secret||'留空表示不修改')}"></div><div class="form-group"><label>预期主机名</label><input name="expectedHostname" value="${attr(t.expectedHostname)}" placeholder="domains.example.com"></div><div class="form-group"><label>申请 Action</label><input name="actionApply" value="${attr(t.actionApply)}"></div><div class="form-group"><label>登录 Action</label><input name="actionLogin" value="${attr(t.actionLogin)}"></div><div class="form-group"><label>注册 Action</label><input name="actionRegister" value="${attr(t.actionRegister)}"></div><div class="form-group full actions"><label class="checkbox"><input name="enabledApply" type="checkbox" ${t.enabledApply?'checked':''}>申请页启用</label><label class="checkbox"><input name="enabledLogin" type="checkbox" ${t.enabledLogin?'checked':''}>登录页启用</label><label class="checkbox"><input name="enabledRegister" type="checkbox" ${t.enabledRegister?'checked':''}>注册页启用</label></div><div class="form-group full"><button class="btn btn-primary" type="submit">保存 Turnstile</button></div></form></div>`;
}
function suffixRow(s={label:'',suffix:'',zoneId:'',allowedTypes:['CNAME'],defaultType:'CNAME',ttl:1,proxied:false,enabled:true}) { const allowed=s.allowedTypes?.length?s.allowedTypes:['CNAME']; return `<div class="suffix-row"><div class="form-group"><label>显示名</label><input data-k="label" value="${attr(s.label)}"></div><div class="form-group"><label>后缀</label><input data-k="suffix" value="${attr(s.suffix)}" placeholder="example.com"></div><div class="form-group"><label>Zone ID</label><input data-k="zoneId" value="${attr(s.zoneId)}"></div><div class="form-group"><label>允许类型</label><input data-k="allowedTypes" value="${attr(allowed.join(','))}" placeholder="CNAME,A,AAAA"></div><div class="form-group"><label>默认类型</label><select data-k="defaultType">${['CNAME','A','AAAA'].map(x=>`<option ${s.defaultType===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="form-group"><label>TTL</label><input data-k="ttl" type="number" min="1" value="${attr(s.ttl||1)}"></div><label class="checkbox"><input data-k="proxied" type="checkbox" ${s.proxied?'checked':''}>代理</label><div class="actions"><label class="checkbox"><input data-k="enabled" type="checkbox" ${s.enabled!==false?'checked':''}>启用</label><button class="btn btn-danger btn-sm" type="button" data-remove-suffix>删除</button></div></div>`; }
function dnsSettings(s) {
  const d=s.dns;
  if (d.envManaged) return `<div class="setting-section" data-section="dns"><h2>Cloudflare DNS 与可申请后缀</h2><div class="announcement info"><strong>当前由 Cloudflare Workers 环境变量管理</strong><br>API Token、Zone ID 和后缀不会写入 GitHub。每条申请的 DNS 目标由用户填写并由管理员审核。</div><p class="secret-state">API Token：${d.apiTokenSource==='worker-secret'?'已配置为 Worker Secret':'未配置'}；后缀来源：${esc(d.suffixSource)}</p><div class="table-wrap"><table><thead><tr><th>显示名</th><th>后缀</th><th>Zone ID</th><th>允许类型</th><th>默认类型</th><th>代理</th><th>状态</th></tr></thead><tbody>${(d.suffixes||[]).map(x=>`<tr><td>${esc(x.label)}</td><td class="mono">${esc(x.suffix)}</td><td class="mono">${esc(x.zoneId)}</td><td>${esc((x.allowedTypes||[]).join(', '))}</td><td>${esc(x.defaultType)}</td><td>${x.proxied?'是':'否'}</td><td>${x.enabled?'启用':'停用'}</td></tr>`).join('')||'<tr><td colspan="7">尚未配置 DNS 后缀</td></tr>'}</tbody></table></div><p class="help">机密：CF_API_TOKEN。单后缀变量：DNS_SUFFIX、DNS_ZONE_ID、DNS_ALLOWED_TYPES、DNS_DEFAULT_TYPE、DNS_TTL、DNS_PROXIED。</p></div>`;
  return `<div class="setting-section" data-section="dns"><h2>Cloudflare DNS 与可申请后缀</h2><p class="secret-state">API Token 来源：${esc(d.apiTokenSource)}。运行时 Token 建议只授予目标 Zone 的 DNS:Edit。</p><form id="dns-form"><div class="form-grid"><div class="form-group"><label>Cloudflare DNS API Token</label><input name="apiToken" type="password" placeholder="${attr(d.apiToken||'留空表示不修改')}"></div><div class="form-group"><label>保留前缀</label><input name="reservedPrefixes" value="${attr((d.reservedPrefixes||[]).join(','))}"></div></div><h3 style="margin-top:24px">后缀配置</h3><div id="suffix-list">${(d.suffixes||[]).map(suffixRow).join('')}</div><div class="actions"><button class="btn btn-secondary" type="button" id="add-suffix">添加后缀</button><button class="btn btn-primary" type="submit">保存 DNS 配置</button></div></form></div>`;
}
function registrationSettings(s,keys) { return `<div class="setting-section" data-section="registration"><h2>注册设置</h2><form id="registration-form" class="form-grid"><div class="form-group full actions"><label class="checkbox"><input name="enabled" type="checkbox" ${s.registration.enabled?'checked':''}>开放注册</label><label class="checkbox"><input name="requireKey" type="checkbox" ${s.registration.requireKey?'checked':''}>要求注册密钥</label><label class="checkbox"><input name="autoActivate" type="checkbox" ${s.registration.autoActivate?'checked':''}>注册后自动启用</label></div><div class="form-group full"><button class="btn btn-primary" type="submit">保存注册设置</button></div></form><hr style="border:0;border-top:1px solid var(--line);margin:28px 0"><div class="grid grid-2"><form id="new-key-form" class="card" style="box-shadow:none"><h3>生成注册密钥</h3><div class="form-group"><label>名称</label><input name="name" value="邀请密钥"></div><div class="form-group"><label>最大使用次数（0=不限）</label><input name="maxUses" type="number" min="0" value="1"></div><div class="form-group"><label>过期时间（可选）</label><input name="expiresAt" type="datetime-local"></div><button class="btn btn-primary" type="submit">生成密钥</button></form><div><h3>现有密钥</h3><div class="table-wrap"><table style="min-width:520px"><thead><tr><th>名称</th><th>前缀</th><th>使用</th><th>状态</th><th></th></tr></thead><tbody>${keys.map(k=>`<tr><td>${esc(k.name)}</td><td class="mono">${esc(k.key_prefix)}…</td><td>${k.used_count}/${Number(k.max_uses)===0?'∞':k.max_uses}</td><td>${k.active?badge('active'):badge('disabled')}</td><td>${k.active?`<button class="btn btn-danger btn-sm" data-disable-key="${k.id}">停用</button>`:''}</td></tr>`).join('')||'<tr><td colspan="5">暂无密钥</td></tr>'}</tbody></table></div></div></div></div>`; }
function noticeSettings(s) { return `<div class="setting-section" data-section="notice"><div class="grid grid-2"><form id="announcement-form" class="card" style="box-shadow:none"><h2>顶部公告</h2><label class="checkbox"><input name="enabled" type="checkbox" ${s.announcement.enabled?'checked':''}>启用</label><div class="form-group"><label>类型</label><select name="level"><option value="info" ${s.announcement.level==='info'?'selected':''}>提示</option><option value="success" ${s.announcement.level==='success'?'selected':''}>成功</option><option value="warning" ${s.announcement.level==='warning'?'selected':''}>警告</option></select></div><div class="form-group"><label>内容</label><textarea name="text">${esc(s.announcement.text)}</textarea></div><button class="btn btn-primary" type="submit">保存公告</button></form><form id="popup-form" class="card" style="box-shadow:none"><h2>弹窗设置</h2><div class="actions"><label class="checkbox"><input name="enabled" type="checkbox" ${s.popup.enabled?'checked':''}>启用</label><label class="checkbox"><input name="oncePerSession" type="checkbox" ${s.popup.oncePerSession?'checked':''}>每个会话仅一次</label></div><div class="form-group"><label>标题</label><input name="title" value="${attr(s.popup.title)}"></div><div class="form-group"><label>内容</label><textarea name="content">${esc(s.popup.content)}</textarea></div><button class="btn btn-primary" type="submit">保存弹窗</button></form></div></div>`; }
function securitySettings() { return `<div class="setting-section" data-section="security"><h2>修改管理员密码</h2><form id="admin-password-form" class="form-grid" style="max-width:620px"><div class="form-group full"><label>当前密码</label><input name="currentPassword" type="password" required></div><div class="form-group full"><label>新密码</label><input name="newPassword" type="password" minlength="10" required></div><div class="form-group full"><button class="btn btn-primary" type="submit">修改并退出所有会话</button></div></form></div>`; }

function bindSettingsEvents() {
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('[data-section]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.querySelector(`[data-section="${btn.dataset.tab}"]`)?.classList.add('active');}));
  bindJsonForm('#site-form','site', f=>Object.fromEntries(f));
  bindJsonForm('#turnstile-form','turnstile', f=>({siteKey:f.get('siteKey'),secret:f.get('secret'),expectedHostname:f.get('expectedHostname'),actionApply:f.get('actionApply'),actionLogin:f.get('actionLogin'),actionRegister:f.get('actionRegister'),enabledApply:f.get('enabledApply')==='on',enabledLogin:f.get('enabledLogin')==='on',enabledRegister:f.get('enabledRegister')==='on'}));
  document.querySelector('#add-suffix')?.addEventListener('click',()=>{document.querySelector('#suffix-list')?.insertAdjacentHTML('beforeend',suffixRow());bindRemoveSuffix();});
  bindRemoveSuffix();
  document.querySelector('#dns-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const suffixes=[...document.querySelectorAll('.suffix-row')].map(row=>{const get=k=>row.querySelector(`[data-k="${k}"]`);return{label:get('label').value,suffix:get('suffix').value,zoneId:get('zoneId').value,allowedTypes:String(get('allowedTypes').value||'').split(','),defaultType:get('defaultType').value,ttl:get('ttl').value,proxied:get('proxied').checked,enabled:get('enabled').checked};});try{await api('/api/admin/settings/dns',{method:'PUT',body:{apiToken:f.get('apiToken'),reservedPrefixes:String(f.get('reservedPrefixes')||'').split(','),suffixes}});toast('DNS 配置已保存','success');await refreshConfig();}catch(error){toast(error.message,'error');}});
  bindJsonForm('#registration-form','registration',f=>({enabled:f.get('enabled')==='on',requireKey:f.get('requireKey')==='on',autoActivate:f.get('autoActivate')==='on'}));
  bindJsonForm('#announcement-form','announcement',f=>({enabled:f.get('enabled')==='on',level:f.get('level'),text:f.get('text')}));
  bindJsonForm('#popup-form','popup',f=>({enabled:f.get('enabled')==='on',oncePerSession:f.get('oncePerSession')==='on',title:f.get('title'),content:f.get('content')}));
  document.querySelector('#new-key-form')?.addEventListener('submit',async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget));try{const r=await api('/api/admin/registration-keys',{method:'POST',body});openModal('注册密钥已生成',`<p>密钥只完整显示这一次，请立即保存：</p><div class="domain-preview"><code style="font-size:16px">${esc(r.key.rawKey)}</code></div>`);toast('注册密钥已生成','success');}catch(error){toast(error.message,'error');}});
  document.querySelectorAll('[data-disable-key]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('确认停用该注册密钥？'))return;try{await api(`/api/admin/registration-keys/${b.dataset.disableKey}`,{method:'DELETE'});toast('密钥已停用','success');renderAdminSettings();}catch(error){toast(error.message,'error');}}));
  document.querySelector('#admin-password-form')?.addEventListener('submit',async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget));try{await api('/api/auth/change-password',{method:'POST',body});toast('密码已修改，请重新登录','success');state.me=null;go('#/login');}catch(error){toast(error.message,'error');}});
}
function bindRemoveSuffix(){document.querySelectorAll('[data-remove-suffix]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.addEventListener('click',()=>b.closest('.suffix-row').remove());});}
function bindJsonForm(selector,group,mapper){document.querySelector(selector)?.addEventListener('submit',async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{await api(`/api/admin/settings/${group}`,{method:'PUT',body:mapper(new FormData(e.currentTarget))});toast('设置已保存','success');await refreshConfig();}catch(error){toast(error.message,'error');}finally{button.disabled=false;}});}
async function refreshConfig(){const {config}=await api('/api/public/config');state.config=config;applyTheme();}

async function renderAdminAnalytics() {
  shell('数据分析', `<div class="loading-screen" style="min-height:55vh"><div class="spinner"></div></div>`);
  try {
    const { analytics:a } = await api('/api/admin/analytics?days=30');
    const maxDaily=Math.max(1,...a.daily.map(x=>Number(x.count))); const bars=a.daily.map(x=>`<div class="spark-col" title="${esc(x.day)}：${x.count}"><div class="spark-bar" style="height:${Math.max(2,Number(x.count)/maxDaily*145)}px"></div><div class="spark-label">${esc(String(x.day).slice(5))}</div></div>`).join('');
    const statusBars=barList(a.status,'status'); const suffixBars=barList(a.suffix,'suffix');
    shell('数据分析', `<div class="grid grid-2"><section class="card"><h2>近 30 天申请趋势</h2><div class="spark-bars">${bars||'<div class="empty">暂无数据</div>'}</div></section><section class="card"><h2>申请状态分布</h2>${statusBars}</section><section class="card"><h2>热门后缀</h2>${suffixBars}</section><section class="card"><h2>数据说明</h2><p class="muted">统计数据直接由 D1 聚合，不依赖第三方分析服务。Cloudflare Workers 自身流量与错误可在 Cloudflare Observability 中查看。</p></section></div>`);
  } catch (error) { toast(error.message,'error'); }
}
function barList(items,key){const max=Math.max(1,...items.map(x=>Number(x.count)));return `<div class="bar-list">${items.map(x=>`<div class="bar-row"><span>${esc(key==='status'?(statusText[x[key]]||x[key]):x[key])}</span><div class="bar-track"><div class="bar-fill" style="width:${Number(x.count)/max*100}%"></div></div><strong>${x.count}</strong></div>`).join('')||'<div class="empty">暂无数据</div>'}</div>`;}

async function renderAdminAudit() {
  shell('审计日志', `<section class="card"><div class="empty"><div class="spinner"></div></div></section>`);
  try { const {logs}=await api('/api/admin/audit?limit=300'); const rows=logs.map(l=>`<tr><td>${fmtDate(l.created_at)}</td><td>${esc(l.username||'系统')}</td><td class="mono">${esc(l.action)}</td><td>${esc(l.target_type||'—')} / ${esc(l.target_id||'—')}</td><td><small>${esc(l.ip||'—')}</small></td><td><small class="mono">${esc(l.meta?JSON.stringify(l.meta):'—')}</small></td></tr>`).join('');shell('审计日志',`<section class="card"><h2>最近操作</h2><div class="table-wrap"><table><thead><tr><th>时间</th><th>操作者</th><th>动作</th><th>目标</th><th>IP</th><th>元数据</th></tr></thead><tbody>${rows}</tbody></table></div></section>`);}catch(error){toast(error.message,'error');}
}

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (state.turnstilePromise) return state.turnstilePromise;
  state.turnstilePromise = new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.onload=()=>resolve(window.turnstile);script.onerror=()=>reject(new Error('Turnstile 脚本加载失败'));document.head.appendChild(script);
  });
  return state.turnstilePromise;
}
async function mountTurnstile(selector, action) {
  const box=document.querySelector(selector); if(!box)return;
  if(!state.config.turnstile.siteKey){box.innerHTML='<div class="announcement warning">管理员尚未配置 Turnstile Site Key。</div>';return;}
  try { const t=await loadTurnstile(); state.widgetId=t.render(box,{sitekey:state.config.turnstile.siteKey,action,theme:'auto',language:'zh-cn'}); }
  catch(error){box.innerHTML=`<div class="announcement warning">${esc(error.message)}</div>`;}
}
function turnstileToken(){return state.widgetId!==null&&window.turnstile?window.turnstile.getResponse(state.widgetId):'';}
function resetTurnstile(){if(state.widgetId!==null&&window.turnstile)window.turnstile.reset(state.widgetId);}

init();
