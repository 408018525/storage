const app = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');
const modalRoot = document.querySelector('#modal-root');

const state = {
  config: null,
  me: null,
  applications: [],
  quota: { used: 0, total: 3, remaining: 3 },
  widgetId: null,
};


const DEFAULT_DOMAIN_CONFIG = {
  defaultQuota: 3,
  validDays: 365,
  renewWindowDays: 60,
  allowUserDeleteInvalid: true,
  allowDnsEditAfterApproved: true,
};
function domainConfig(value = state.config?.domain) {
  return { ...DEFAULT_DOMAIN_CONFIG, ...(value || {}) };
}
function suffixList() {
  return state.config?.suffixes || state.config?.dns?.suffixes || [];
}

const statusText = {
  pending: '待审核',
  processing: '处理中',
  approved: '正常',
  rejected: '已拒绝',
  revoking: '撤销中',
  revoked: '已撤销',
  deleted: '已删除',
  active: '启用',
  disabled: '禁用',
};

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}
function attr(value) { return esc(value).replace(/`/g, '&#96;'); }
function fmtDate(value, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleString('zh-CN', withTime ? { hour12:false } : { year:'numeric', month:'2-digit', day:'2-digit' }).replace(/\//g, '/');
}
function statusBadge(status, label) {
  return `<span class="status-pill status-${esc(status)}">${esc(label || statusText[status] || status)}</span>`;
}
function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
function closeModal() {
  modalRoot.innerHTML = '';
  state.widgetId = null;
}
function openModal(title, subtitle, content, size = '') {
  modalRoot.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal ${size}">
        <div class="modal-titlebar">
          <div class="modal-icon">＋</div>
          <div><h2>${esc(title)}</h2><p>${esc(subtitle || '')}</p></div>
          <button class="modal-x" data-close-modal type="button">×</button>
        </div>
        <div class="modal-body">${content}</div>
      </div>
    </div>`;
  modalRoot.querySelector('[data-close-modal]').addEventListener('click', closeModal);
  modalRoot.querySelector('.modal-backdrop').addEventListener('click', e => {
    if (e.target.classList.contains('modal-backdrop')) closeModal();
  });
}
async function api(path, options = {}) {
  const opts = { method: options.method || 'GET', headers: { ...(options.headers || {}) }, credentials: 'same-origin' };
  if (options.body !== undefined) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(options.body);
  }
  const res = await fetch(path, opts);
  let data;
  try { data = await res.json(); } catch { data = { ok:false, message:`HTTP ${res.status}` }; }
  if (!res.ok || data.ok === false) {
    const error = new Error(data.message || '请求失败');
    error.code = data.code;
    error.details = data.details;
    throw error;
  }
  return data;
}

function applyTheme() {
  const site = state.config?.site || {};
  document.documentElement.style.setProperty('--accent', site.accent || '#4f63f6');
  document.documentElement.style.setProperty('--accent-2', site.accent2 || '#7c4dff');
  document.title = site.title || '免费二级域名注册中心';
}

async function init() {
  try {
    const [{ config }, me] = await Promise.all([
      api('/api/public/config'),
      api('/api/auth/me').catch(() => ({ user:null })),
    ]);
    state.config = config;
    state.me = me.user;
    applyTheme();
    await route();
  } catch (error) {
    app.innerHTML = `<div class="center-screen"><h2>应用加载失败</h2><p>${esc(error.message)}</p><button class="btn primary" id="retry">重试</button></div>`;
    document.querySelector('#retry')?.addEventListener('click', () => location.reload());
  }
}

function go(hash) { location.hash = hash; }
window.addEventListener('hashchange', route);

async function route() {
  const hash = location.hash || (state.me ? '#/apply' : '#/login');

  if (state.config?.needsBootstrap && hash !== '#/setup') return go('#/setup');
  if (!state.me && !['#/login', '#/register', '#/setup'].includes(hash)) return go('#/login');
  if (state.me && ['#/login', '#/register', '#/setup'].includes(hash)) return go('#/apply');
  if (hash.startsWith('#/admin') && state.me?.role !== 'admin') return go('#/apply');

  state.widgetId = null;

  if (hash.startsWith('#/domain/')) return renderDomainDetail(hash.replace('#/domain/', ''));
  if (hash === '#/setup') return renderSetup();
  if (hash === '#/login') return renderLogin();
  if (hash === '#/register') return renderRegister();
  if (hash === '#/apply') return renderApply();
  if (hash === '#/domains' || hash === '#/applications') return renderDomains();
  if (hash === '#/account') return renderAccount();
  if (hash === '#/admin') return renderAdminOverview();
  if (hash === '#/admin/applications') return renderAdminApplications();
  if (hash === '#/admin/users') return renderAdminUsers();
  if (hash === '#/admin/settings') return renderAdminSettings();

  return state.me ? renderApply() : renderLogin();
}

function authTemplate(title, subtitle, formHtml) {
  const site = state.config?.site || {};
  return `<main class="auth-wrap">
    <section class="auth-brand">
      <div class="auth-logo">${esc(site.logoText || '域')}</div>
      <h1>${esc(site.title || '免费二级域名注册中心')}</h1>
      <p>${esc(site.subtitle || '快速注册并管理您的专属免费域名')}</p>
    </section>
    <section class="auth-card">
      <h2>${esc(title)}</h2>
      <p>${esc(subtitle)}</p>
      ${formHtml}
    </section>
  </main>`;
}

async function renderSetup() {
  app.innerHTML = authTemplate('初始化管理员', '首次部署需要创建管理员账户。', `
    <form id="setup-form" class="form-grid">
      <label class="field wide"><span>初始化令牌</span><input name="setupToken" type="password" required></label>
      <label class="field"><span>管理员用户名</span><input name="username" required minlength="3" maxlength="32"></label>
      <label class="field"><span>邮箱</span><input name="email" type="email"></label>
      <label class="field wide"><span>管理员密码</span><input name="password" type="password" required minlength="10"><em>至少 10 位，并包含字母和数字。</em></label>
      <button class="btn primary wide" type="submit">创建管理员</button>
    </form>`);
  document.querySelector('#setup-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      const result = await api('/api/setup/bootstrap', { method:'POST', body:Object.fromEntries(new FormData(e.currentTarget)) });
      state.me = result.user;
      state.config.needsBootstrap = false;
      toast('管理员创建成功', 'success');
      go('#/admin/settings');
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
}

async function renderLogin() {
  const turn = state.config.turnstile || {};
  app.innerHTML = authTemplate('登录', '进入域名注册与管理中心。', `
    <form id="login-form" class="form-grid">
      <label class="field wide"><span>用户名或邮箱</span><input name="identity" required autocomplete="username"></label>
      <label class="field wide"><span>密码</span><input name="password" type="password" required autocomplete="current-password"></label>
      <label class="check wide"><input name="remember" type="checkbox"> 30 天内保持登录</label>
      ${turn.enabledLogin ? '<div class="wide"><div id="turnstile-box"></div></div>' : ''}
      <button class="btn primary wide" type="submit">登录</button>
    </form>
    <p class="auth-link">没有账户？ <a href="#/register">注册</a></p>
    <a class="btn secondary wide" href="#/register" style="margin-top:12px;text-align:center">创建新账户</a>`);
  if (turn.enabledLogin) await mountTurnstile('#turnstile-box', turn.actionLogin);
  document.querySelector('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const f = new FormData(e.currentTarget);
    try {
      const result = await api('/api/auth/login', { method:'POST', body:{
        identity:f.get('identity'), password:f.get('password'), remember:f.get('remember') === 'on', turnstileToken:turnstileToken(),
      }});
      state.me = result.user;
      toast('登录成功', 'success');
      go(result.user.role === 'admin' ? '#/admin' : '#/apply');
    } catch (error) {
      toast(error.message, 'error');
      resetTurnstile();
      btn.disabled = false;
    }
  });
}

async function renderRegister() {
  // 注册入口默认开放，避免历史设置导致新用户无法注册。
  const turn = state.config.turnstile || {};
  app.innerHTML = authTemplate('创建账户', '注册后默认拥有 3 个域名额度。', `
    <form id="register-form" class="form-grid">
      <label class="field"><span>用户名</span><input name="username" required minlength="3" maxlength="32"></label>
      <label class="field"><span>邮箱</span><input name="email" type="email"></label>
      <label class="field wide"><span>密码</span><input name="password" type="password" required minlength="10"><em>至少 10 位，并包含字母和数字。</em></label>
      ${turn.enabledRegister ? '<div class="wide"><div id="turnstile-box"></div></div>' : ''}
      <button class="btn primary wide" type="submit">注册</button>
    </form>
    <p class="auth-link">已有账户？ <a href="#/login">登录</a></p>`);
  if (turn.enabledRegister) await mountTurnstile('#turnstile-box', turn.actionRegister);
  document.querySelector('#register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const body = Object.fromEntries(new FormData(e.currentTarget));
    body.turnstileToken = turnstileToken();
    try {
      const result = await api('/api/auth/register', { method:'POST', body });
      if (result.pendingActivation) {
        toast('注册成功，请等待管理员启用账户', 'success');
      } else {
        toast('注册成功，请使用刚才的账号密码登录', 'success');
      }
      go('#/login');
    } catch (error) {
      toast(error.message, 'error');
      resetTurnstile();
      btn.disabled = false;
    }
  });
}

function nav(hash, icon, text) {
  return `<a class="nav ${location.hash === hash ? 'active' : ''}" href="${hash}"><span>${icon}</span>${esc(text)}</a>`;
}
function shell(title, content) {
  const site = state.config.site || {};
  const isAdmin = state.me?.role === 'admin';
  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><div>${esc(site.logoText || '域')}</div><strong>${esc(site.title || '域名注册中心')}</strong></div>
      <nav>
        ${nav('#/apply','＋','域名注册')}
        ${nav('#/domains','🌐','域名管理')}
        ${nav('#/account','⚙','账户设置')}
        ${isAdmin ? `<hr>${nav('#/admin','▦','管理概览')}${nav('#/admin/applications','✓','域名审核')}${nav('#/admin/users','♟','用户管理')}${nav('#/admin/settings','⚙','管理员设置')}` : ''}
      </nav>
      <div class="side-user"><strong>${esc(state.me.username)}</strong><small>${isAdmin ? '管理员' : '普通用户'}</small><button id="logout" class="btn ghost">退出登录</button></div>
    </aside>
    <main class="main">
      <header class="topbar">
        <button class="btn ghost menu-btn" id="menu">☰</button>
        <h1>${esc(title)}</h1>
        <div>${statusBadge(state.me.status || 'active')}</div>
      </header>
      <section class="content">${content}</section>
    </main>
  </div>`;
  document.querySelector('#logout')?.addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method:'POST', body:{} }); } catch {}
    state.me = null;
    go('#/login');
  });
  document.querySelector('#menu')?.addEventListener('click', () => document.querySelector('.sidebar')?.classList.toggle('open'));
}

async function loadApplications() {
  const result = await api('/api/applications');
  state.applications = result.applications || [];
  const fallbackTotal = Number(domainConfig().defaultQuota || 3);
  const q = result.quota || { used: 0, total: fallbackTotal, remaining: fallbackTotal };
  const total = Number(q.total || fallbackTotal) >= 9999 ? fallbackTotal : Number(q.total || fallbackTotal);
  const used = Number(q.used || 0);
  state.quota = { ...q, used, total, remaining: Math.max(0, total - used), label: `${used} / ${total}` };
  return result;
}

async function renderApply() {
  shell('域名注册', `<div class="loading-card">正在读取域名数据…</div>`);
  try {
    await loadApplications();
    const recent = state.applications.slice(0, 3);
    const recentHtml = recent.map(domainCard).join('');

    shell('域名注册', `
      <div class="notice">请勿申请违法、侵权、仿冒或误导性域名。</div>
      <section class="quota-hero">
        <div class="quota-icon">☁</div>
        <div><strong>${state.quota.used} / ${state.quota.total}</strong><span>已注册</span></div>
        <div class="quota-left"><span>剩余</span><strong>${state.quota.remaining}</strong></div>
        <button class="btn primary" id="open-register">＋ 注册新域名</button>
      </section>

      <section class="card">
        <h2>域名注册</h2>
        <p>申请时只需要填写前缀和根域名。DNS 记录类型与目标地址在“域名管理”中填写，管理员审核通过后写入 Cloudflare DNS。</p>
        <div class="steps">
          <div><b>1</b><strong>填写前缀</strong></div>
          <div><b>2</b><strong>提交审核</strong></div>
          <div><b>3</b><strong>配置 DNS</strong></div>
          <div><b>4</b><strong>管理员批准</strong></div>
        </div>
      </section>

      <section class="card">
        <div class="section-head"><div><h2>最近域名</h2><p>默认有效期 ${domainConfig().validDays} 天，最后 ${domainConfig().renewWindowDays} 天可申请续期。</p></div><a class="btn soft" href="#/domains">全部域名</a></div>
        ${recentHtml || '<div class="empty">暂无域名，点击右上方注册新域名。</div>'}
      </section>`);
    document.querySelector('#open-register').addEventListener('click', showRegisterDomainModal);
    bindDomainCardActions();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function showRegisterDomainModal() {
  const suffixes = suffixList();
  const options = suffixes.map(s => `<option value="${attr(s.suffix)}">${esc(s.label)} / ${esc(s.suffix)}</option>`).join('');
  openModal('注册新域名', '选择根域名并输入前缀，快速注册一个专属您的免费域名', `
    <form id="domain-register-form" class="modal-form">
      <label class="field wide">
        <span>选择根域名</span>
        <select id="domain-suffix" name="suffix" required>
          <option value="">请选择根域名</option>${options}
        </select>
      </label>
      <label class="field wide">
        <span>域名前缀</span>
        <div class="suffix-input">
          <input id="domain-prefix" name="prefix" placeholder="输入前缀，如: myblog" minlength="2" maxlength="36" required>
          <strong id="suffix-preview">.请选择根域名</strong>
        </div>
        <em>2-36 位，仅支持字母、数字和连字符 -</em>
      </label>
      <div class="preview-box">
        <span>完整域名预览</span>
        <strong id="full-preview">请选择根域名并输入前缀</strong>
      </div>
      <div class="dns-note"><span>ℹ</span><strong>注册成功后，您需要手动设置 DNS 解析</strong><button type="button" id="dns-help">查看完整说明 ›</button></div>
      ${state.config.turnstile.enabledApply ? '<div id="turnstile-box" class="turnstile-holder"></div>' : ''}
      <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button id="confirm-register" class="btn primary" type="submit" disabled>确认注册</button></div>
    </form>
  `, 'wide');
  const suffix = document.querySelector('#domain-suffix');
  const prefix = document.querySelector('#domain-prefix');
  const submit = document.querySelector('#confirm-register');
  const refresh = () => {
    const s = suffix.value;
    const p = prefix.value.trim();
    document.querySelector('#suffix-preview').textContent = s ? `.${s}` : '.请选择根域名';
    document.querySelector('#full-preview').textContent = s && p ? `${p}.${s}` : '请选择根域名并输入前缀';
    submit.disabled = !(s && /^[a-z0-9](?:[a-z0-9-]{0,34}[a-z0-9])?$/.test(p) && p.length >= 2);
  };
  suffix.addEventListener('change', refresh);
  prefix.addEventListener('input', refresh);
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#dns-help').addEventListener('click', () => toast('注册后进入“域名管理”点击“管理域名”，在 DNS 解析中添加 CNAME/A/AAAA。', 'success'));
  if (state.config.turnstile.enabledApply) mountTurnstile('#turnstile-box', state.config.turnstile.actionApply);
  document.querySelector('#domain-register-form').addEventListener('submit', async e => {
    e.preventDefault();
    submit.disabled = true;
    try {
      await api('/api/applications', { method:'POST', body:{ prefix:prefix.value, suffix:suffix.value, turnstileToken:turnstileToken() } });
      closeModal();
      toast('域名已提交，请继续配置 DNS 解析', 'success');
      await renderApply();
    } catch (error) {
      toast(error.message, 'error');
      resetTurnstile();
      submit.disabled = false;
    }
  });
}

async function renderDomains() {
  shell('域名管理', `<div class="loading-card">正在读取域名列表…</div>`);
  try {
    await loadApplications();
    const cards = state.applications.map(domainCard).join('');
    shell('域名管理', `
      <section class="quota-hero compact">
        <div class="quota-icon">☁</div>
        <div><strong>${state.quota.used} / ${state.quota.total}</strong><span>已注册</span></div>
        <div class="quota-left"><span>剩余</span><strong>${state.quota.remaining}</strong></div>
        <button class="btn primary" id="open-register">＋ 注册新域名</button>
      </section>
      <section class="card">
        <div class="section-head"><div><h2>我的域名</h2><p>到期时间、剩余时间、DNS 状态都在这里查看。</p></div></div>
        <div class="domain-list">${cards || '<div class="empty">暂无域名。</div>'}</div>
      </section>`);
    document.querySelector('#open-register')?.addEventListener('click', showRegisterDomainModal);
    bindDomainCardActions();
  } catch (error) { toast(error.message, 'error'); }
}

function domainCard(a) {
  const dns = a.dnsConfigured ? `${a.recordType} → ${a.recordContent}` : '未配置';
  const status = a.statusText || statusText[a.status] || a.status;
  return `<article class="domain-card" data-id="${attr(a.id)}">
    <div class="domain-head">
      <div class="globe">🌐</div>
      <div class="domain-title"><h3>${esc(a.fqdnUnicode)}</h3><code>${esc(a.fqdnAscii)}</code></div>
      ${statusBadge(a.status, status)}
    </div>
    <div class="domain-metrics">
      <div><span>注册时间</span><strong>${fmtDate(a.createdAt)}</strong></div>
      <div><span>到期时间</span><strong>${a.expiresAt ? fmtDate(a.expiresAt) : '—'}</strong></div>
      <div><span>剩余时间</span><strong>${esc(a.remainingText || '未设置到期时间')}</strong></div>
      <div><span>DNS</span><strong class="mono">${esc(dns)}</strong></div>
    </div>
    ${a.errorMessage ? `<p class="error-line">${esc(a.errorMessage)}</p>` : ''}
    <div class="card-actions">
      <button class="btn soft" data-manage="${attr(a.id)}">管理域名</button>
      ${a.canRenew ? `<button class="btn success" data-renew="${attr(a.id)}">续期</button>` : ''}
      ${a.canRequestDelete ? `<button class="btn danger-soft" data-request-delete="${attr(a.id)}">申请删除域名</button>` : ''}
      ${a.deleteRequested ? `<button class="btn secondary" disabled>删除待审核</button>` : ''}
      ${a.canDelete ? `<button class="btn danger-soft" data-delete="${attr(a.id)}">删除无效域名</button>` : ''}
    </div>
  </article>`;
}

function bindDomainCardActions() {
  document.querySelectorAll('[data-manage]').forEach(btn => btn.addEventListener('click', () => go(`#/domain/${btn.dataset.manage}`)));
  document.querySelectorAll('[data-renew]').forEach(btn => btn.addEventListener('click', () => renewDomain(btn.dataset.renew)));
  document.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => showDeleteDomainModal(btn.dataset.delete)));
  document.querySelectorAll('[data-request-delete]').forEach(btn => btn.addEventListener('click', () => showRequestDeleteDomainModal(btn.dataset.requestDelete)));
}

async function renderDomainDetail(id) {
  shell('域名管理', `<div class="loading-card">正在读取域名详情…</div>`);
  try {
    const { application: a } = await api(`/api/applications/${encodeURIComponent(id)}`);
    const dnsRows = a.dnsConfigured ? `
      <tr><td>@</td><td>${esc(a.recordType)}</td><td class="mono">${esc(a.recordContent)}</td><td>${a.ttl === 1 ? '自动' : esc(a.ttl)}</td><td>${a.proxied ? '代理' : 'DNS Only'}</td></tr>
    ` : '';

    shell('域名管理', `
      <section class="detail-hero">
        <a class="back-link" href="#/domains">← 返回域名列表</a>
        <div class="detail-main">
          <div class="globe big">🌐</div>
          <div><h1>${esc(a.fqdnUnicode)}</h1><code>${esc(a.fqdnAscii)}</code></div>
          ${statusBadge(a.status, a.statusText)}
          <div class="detail-actions">
            <button class="btn primary" id="add-dns">＋ 添加解析</button>
            ${a.canRenew ? `<button class="btn success" id="renew-domain">▣ 续期</button>` : ''}
            ${a.canRequestDelete ? `<button class="btn danger-soft" id="request-delete-domain">申请删除</button>` : ''}
            ${a.deleteRequested ? `<button class="btn secondary" disabled>删除待审核</button>` : ''}
          </div>
        </div>
      </section>

      <section class="detail-panel">
        <div class="tabs">
          <button class="tab active" data-tab="overview">⌂ 概览</button>
          <button class="tab" data-tab="dns">☷ DNS 解析</button>
          <button class="tab" data-tab="renew">▦ 续期和域名详情</button>
        </div>

        <div class="tab-page active" data-page="overview">
          <div class="detail-grid">
            <div class="info-card"><h2>域名状态</h2>
              <dl>
                <dt>域名状态</dt><dd>${statusBadge(a.status, a.statusText)}</dd>
                <dt>DNS 状态</dt><dd>${a.dnsConfigured ? statusBadge('approved','已配置') : statusBadge('pending','未配置')}</dd>
                <dt>DNS 记录</dt><dd>${a.dnsConfigured ? 1 : 0}</dd>
                <dt>到期时间</dt><dd>${a.expiresAt ? fmtDate(a.expiresAt, true) : '未设置'}</dd>
              </dl>
            </div>
            <div class="info-card"><h2>快捷操作</h2>
              <div class="quick-actions">
                <button class="btn primary" data-open-dns>＋ 添加解析</button>
                ${a.canRenew ? `<button class="btn success" data-renew-one>▣ 续期</button>` : '<button class="btn secondary" disabled>未到续期时间</button>'}
                ${a.canRequestDelete ? `<button class="btn danger-soft" data-request-delete-one>申请删除域名</button>` : ''}
                ${a.deleteRequested ? `<button class="btn secondary" disabled>删除待审核</button>` : ''}
                ${a.canDelete ? `<button class="btn danger-soft" data-delete-one>删除无效域名</button>` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="tab-page" data-page="dns">
          <div class="section-head"><div><h2>DNS 解析</h2><p>只管理 DNS 记录类型与目标地址，不显示外部 DNS 服务器。</p></div><button class="btn primary" data-open-dns>＋ 添加解析</button></div>
          <div class="table-wrap"><table><thead><tr><th>主机</th><th>类型</th><th>目标地址</th><th>TTL</th><th>代理</th></tr></thead><tbody>${dnsRows || '<tr><td colspan="5">暂无 DNS 解析，请点击“添加解析”。</td></tr>'}</tbody></table></div>
        </div>

        <div class="tab-page" data-page="renew">
          <div class="detail-grid">
            <div class="info-card"><h2>续期信息</h2><dl>
              <dt>注册时间</dt><dd>${fmtDate(a.createdAt, true)}</dd>
              <dt>到期时间</dt><dd>${a.expiresAt ? fmtDate(a.expiresAt, true) : '未设置'}</dd>
              <dt>剩余时间</dt><dd>${esc(a.remainingText)}</dd>
              <dt>续期次数</dt><dd>${esc(a.renewCount || 0)}</dd>
            </dl></div>
            <div class="info-card"><h2>操作</h2><p>默认有效期 ${domainConfig().validDays} 天，最后 ${domainConfig().renewWindowDays} 天可续期。</p>${a.canRenew ? `<button class="btn success" data-renew-one>立即续期</button>` : `<button class="btn secondary" disabled>暂不可续期</button>`}</div>
          </div>
        </div>
      </section>`);
    document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('[data-page]').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`[data-page="${btn.dataset.tab}"]`)?.classList.add('active');
    }));
    document.querySelectorAll('#add-dns,[data-open-dns]').forEach(btn => btn.addEventListener('click', () => showDnsModal(a)));
    document.querySelectorAll('#renew-domain,[data-renew-one]').forEach(btn => btn.addEventListener('click', () => renewDomain(a.id)));
    document.querySelector('[data-delete-one]')?.addEventListener('click', () => showDeleteDomainModal(a.id));
    document.querySelector('#request-delete-domain')?.addEventListener('click', () => showRequestDeleteDomainModal(a.id));
    document.querySelector('[data-request-delete-one]')?.addEventListener('click', () => showRequestDeleteDomainModal(a.id));
  } catch (error) {
    toast(error.message, 'error');
    go('#/domains');
  }
}

function showDnsModal(a) {
  const suffix = (suffixList()).find(s => s.suffix === a.suffixUnicode) || (suffixList())[0] || {};
  const types = suffix.allowedTypes?.length ? suffix.allowedTypes : ['CNAME'];
  openModal('添加解析', `为 ${a.fqdnUnicode} 设置 DNS 解析`, `
    <form id="dns-form" class="modal-form">
      <label class="field wide"><span>DNS 记录类型</span><select name="recordType">${types.map(t => `<option value="${attr(t)}" ${a.recordType === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="field wide"><span>目标地址</span><input name="target" value="${attr(a.recordContent || '')}" placeholder="例如：your-project.pages.dev" required></label>
      <div class="preview-box"><span>说明</span><strong>CNAME 填完整主机名；A 填 IPv4；AAAA 填 IPv6。不要填写 https:// 或路径。</strong></div>
      <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn primary" type="submit">保存解析</button></div>
    </form>
  `, 'wide');
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#dns-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const f = new FormData(e.currentTarget);
    try {
      await api(`/api/applications/${encodeURIComponent(a.id)}/dns`, { method:'PATCH', body:{ recordType:f.get('recordType'), target:f.get('target') } });
      closeModal();
      toast('DNS 解析已保存', 'success');
      await renderDomainDetail(a.id);
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
}

function showDeleteDomainModal(id) {
  const a = state.applications.find(x => x.id === id);
  openModal('删除无效域名', '此操作只删除已拒绝或已撤销的无效域名记录，不影响正常域名。', `
    <div class="delete-box">
      <p>确认删除：</p>
      <strong>${esc(a?.fqdnUnicode || id)}</strong>
      <p class="danger-text">删除后该记录将从用户列表中隐藏。</p>
    </div>
    <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn danger" id="confirm-delete">确认删除</button></div>
  `);
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#confirm-delete').addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await api(`/api/applications/${encodeURIComponent(id)}`, { method:'DELETE' });
      closeModal();
      toast('无效域名已删除', 'success');
      await renderDomains();
    } catch (error) { toast(error.message, 'error'); btn.disabled = false; }
  });
}


function showRequestDeleteDomainModal(id) {
  const a = state.applications.find(x => x.id === id) || {};
  openModal('申请删除域名', '正常域名需要管理员审核后才会删除。管理员通过后，系统会自动删除 Cloudflare DNS 记录并从列表隐藏。', `
    <div class="delete-box">
      <p>确认提交删除申请：</p>
      <strong>${esc(a.fqdnUnicode || id)}</strong>
      <p class="danger-text">提交后域名会显示“待删除审核”，审核期间仍占用额度。</p>
    </div>
    <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn danger" id="confirm-request-delete">确认申请删除</button></div>
  `);
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#confirm-request-delete').addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await api(`/api/applications/${encodeURIComponent(id)}/delete-request`, { method:'POST', body:{} });
      closeModal();
      toast('删除申请已提交，等待管理员审核', 'success');
      if (location.hash.startsWith('#/domain/')) await renderDomainDetail(id);
      else await renderDomains();
    } catch (error) { toast(error.message, 'error'); btn.disabled = false; }
  });
}

async function renewDomain(id) {
  if (!confirm('确认续期一年？')) return;
  try {
    await api(`/api/applications/${encodeURIComponent(id)}/renew`, { method:'POST', body:{} });
    toast('续期成功', 'success');
    if (location.hash.startsWith('#/domain/')) await renderDomainDetail(id);
    else await renderDomains();
  } catch (error) { toast(error.message, 'error'); }
}

async function renderAccount() {
  shell('账户设置', `
    <div class="grid two">
      <section class="card"><h2>账户信息</h2><div class="info-list"><span>用户名</span><strong>${esc(state.me.username)}</strong><span>角色</span><strong>${state.me.role === 'admin' ? '管理员' : '普通用户'}</strong><span>域名额度</span><strong>${esc(state.me.domainQuota || state.quota.total || 3)}</strong></div></section>
      <section class="card"><h2>修改密码</h2><form id="password-form" class="form-grid"><label class="field wide"><span>当前密码</span><input name="currentPassword" type="password" required></label><label class="field wide"><span>新密码</span><input name="newPassword" type="password" required minlength="10"></label><button class="btn primary wide" type="submit">修改密码</button></form></section>
    </div>`);
  document.querySelector('#password-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await api('/api/auth/change-password', { method:'POST', body:Object.fromEntries(new FormData(e.currentTarget)) });
      toast('密码已修改，请重新登录', 'success');
      state.me = null;
      go('#/login');
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
}

async function renderAdminOverview() {
  shell('管理概览', `<div class="loading-card">正在统计…</div>`);
  try {
    const { overview } = await api('/api/admin/overview');
    const u = overview.users || {};
    const a = overview.applications || {};
    shell('管理概览', `
      <div class="stats">
        ${stat('用户总数', u.total || 0, `活跃 ${u.active || 0}`)}
        ${stat('待审核', a.pending || 0, '需要处理')}
        ${stat('正常域名', a.approved || 0, '已写入 DNS')}
        ${stat('今日注册', overview.today || 0, '今日新增')}
      </div>
      <section class="card"><h2>快速入口</h2><div class="quick-actions"><a class="btn primary" href="#/admin/applications">审核域名</a><a class="btn secondary" href="#/admin/users">用户管理</a><a class="btn secondary" href="#/admin/settings">管理员设置</a></div></section>`);
  } catch (error) { toast(error.message, 'error'); }
}
function stat(label, value, sub) {
  return `<section class="stat"><span>${esc(label)}</span><strong>${esc(value)}</strong><em>${esc(sub)}</em></section>`;
}

async function renderAdminApplications() {
  shell('域名审核', `<div class="loading-card">正在读取申请…</div>`);
  try {
    const { applications } = await api('/api/admin/applications?limit=500');
    const rows = applications.map(a => `<tr>
      <td><strong>${esc(a.fqdnUnicode)}</strong><br><code>${esc(a.fqdnAscii)}</code></td>
      <td>${esc(a.username || '—')}</td>
      <td>${a.dnsConfigured ? `<b>${esc(a.recordType)}</b> → <code>${esc(a.recordContent)}</code>` : '<span class="muted">未配置 DNS，可先批准</span>'}</td>
      <td>${statusBadge(a.status, a.statusText)}</td>
      <td>${a.expiresAt ? fmtDate(a.expiresAt) : '—'}<br><small>${esc(a.remainingText || '')}</small></td>
      <td class="actions-cell">
        ${a.status === 'pending' ? `<button class="btn success small" data-review="approve" data-id="${a.id}">批准</button><button class="btn danger-soft small" data-review="reject" data-id="${a.id}">拒绝</button>` : ''}
        ${a.deleteRequested ? `<button class="btn danger small" data-review="approve-delete" data-id="${a.id}">批准删除</button><button class="btn soft small" data-review="reject-delete" data-id="${a.id}">拒绝删除</button>` : ''}
        ${a.status === 'approved' && !a.deleteRequested ? `<button class="btn danger-soft small" data-review="revoke" data-id="${a.id}">撤销</button>` : ''}
        ${['rejected','revoked'].includes(a.status) ? `<button class="btn danger-soft small" data-review="delete" data-id="${a.id}">删除</button>` : ''}
      </td>
    </tr>`).join('');
    shell('域名审核', `<section class="card"><div class="section-head"><div><h2>域名审核</h2><p>未配置 DNS 也可以先批准；用户后续在域名管理中添加解析后会写入 Cloudflare DNS。</p></div></div><div class="table-wrap"><table><thead><tr><th>域名</th><th>用户</th><th>DNS</th><th>状态</th><th>到期</th><th>操作</th></tr></thead><tbody>${rows || '<tr><td colspan="6">暂无申请</td></tr>'}</tbody></table></div></section>`);
    document.querySelectorAll('[data-review]').forEach(btn => btn.addEventListener('click', async () => {
      const action = btn.dataset.review;
      const label = { approve:'批准', reject:'拒绝', revoke:'撤销', delete:'删除', 'approve-delete':'批准删除', 'reject-delete':'拒绝删除' }[action];
      if (!confirm(`确认${label}该域名？`)) return;
      const note = (action === 'delete' || action === 'approve-delete') ? '' : (prompt('管理员备注，可留空', '') ?? '');
      btn.disabled = true;
      try {
        await api(`/api/admin/applications/${btn.dataset.id}/${action}`, { method:'POST', body:{ note } });
        toast('操作成功', 'success');
        await renderAdminApplications();
      } catch (error) {
        toast(error.message, 'error');
        btn.disabled = false;
      }
    }));
  } catch (error) { toast(error.message, 'error'); }
}

async function renderAdminUsers() {
  shell('用户管理', `<div class="loading-card">正在读取用户…</div>`);
  try {
    const { users } = await api('/api/admin/users');
    const rows = users.map(u => `<tr>
      <td><strong>${esc(u.username)}</strong><br><small>${esc(u.email || '未填写邮箱')}</small></td>
      <td>${u.role === 'admin' ? '管理员' : '用户'}</td>
      <td>${statusBadge(u.status)}</td>
      <td>${esc(u.domainQuota)}</td>
      <td>${u.applicationCount} / ${u.approvedCount}</td>
      <td><button class="btn soft small" data-edit-user="${u.id}">编辑</button></td>
    </tr>`).join('');
    shell('用户管理', `<section class="card"><h2>用户管理</h2><div class="table-wrap"><table><thead><tr><th>用户</th><th>角色</th><th>状态</th><th>额度</th><th>申请/正常</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div></section>`);
    document.querySelectorAll('[data-edit-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = users.find(x => x.id === btn.dataset.editUser);
        showUserModal(u);
      });
    });
  } catch (error) { toast(error.message, 'error'); }
}
function showUserModal(u) {
  openModal('编辑用户', u.username, `
    <form id="user-form" class="modal-form">
      <label class="field wide"><span>角色</span><select name="role"><option value="user" ${u.role==='user'?'selected':''}>用户</option><option value="admin" ${u.role==='admin'?'selected':''}>管理员</option></select></label>
      <label class="field wide"><span>状态</span><select name="status"><option value="active" ${u.status==='active'?'selected':''}>启用</option><option value="disabled" ${u.status==='disabled'?'selected':''}>禁用</option></select></label>
      <label class="field wide"><span>域名额度</span><input name="domainQuota" type="number" min="0" max="9999" value="${attr(u.domainQuota || 3)}"></label>
      <div class="modal-actions"><button class="btn secondary" type="button" data-cancel>取消</button><button class="btn primary" type="submit">保存</button></div>
    </form>`);
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#user-form').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api(`/api/admin/users/${u.id}`, { method:'PATCH', body:Object.fromEntries(new FormData(e.currentTarget)) });
      closeModal();
      toast('用户已更新', 'success');
      renderAdminUsers();
    } catch (error) { toast(error.message, 'error'); }
  });
}

async function renderAdminSettings() {
  shell('管理员设置', `<div class="loading-card">正在读取设置…</div>`);
  try {
    const { settings } = await api('/api/admin/settings');
    shell('管理员设置', `<section class="card admin-settings">
      <div class="tabs">
        <button class="tab active" data-tab="site">界面设置</button>
        <button class="tab" data-tab="registration">注册设置</button>
        <button class="tab" data-tab="domain">域名规则</button>
        <button class="tab" data-tab="dns">DNS配置</button>
      </div>

      <div class="tab-page active" data-page="site">
        <form id="site-form" class="form-grid">
          <label class="field"><span>网站标题</span><input name="title" value="${attr(settings.site.title)}"></label>
          <label class="field"><span>副标题</span><input name="subtitle" value="${attr(settings.site.subtitle)}"></label>
          <label class="field"><span>Logo文字</span><input name="logoText" maxlength="6" value="${attr(settings.site.logoText)}"></label>
          <label class="field"><span>页脚文字</span><input name="footer" value="${attr(settings.site.footer)}"></label>
          <label class="field"><span>主色</span><input name="accent" type="color" value="${attr(settings.site.accent)}"></label>
          <label class="field"><span>辅助色</span><input name="accent2" type="color" value="${attr(settings.site.accent2)}"></label>
          <button class="btn primary wide" type="submit">保存界面设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="registration">
        <form id="registration-form" class="form-grid">
          <label class="check wide"><input name="enabled" type="checkbox" ${settings.registration.enabled ? 'checked' : ''}> 开放用户注册</label>
          <label class="check wide"><input name="autoActivate" type="checkbox" ${settings.registration.autoActivate ? 'checked' : ''}> 注册后自动启用账户</label>
          <button class="btn primary wide" type="submit">保存注册设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="domain">
        <form id="domain-form" class="form-grid">
          <label class="field"><span>默认域名额度</span><input name="defaultQuota" type="number" min="1" max="9999" value="${attr(domainConfig(settings.domain).defaultQuota)}"></label>
          <label class="field"><span>默认有效天数</span><input name="validDays" type="number" min="1" max="3650" value="${attr(domainConfig(settings.domain).validDays)}"></label>
          <label class="field"><span>允许续期窗口/天</span><input name="renewWindowDays" type="number" min="1" max="3650" value="${attr(domainConfig(settings.domain).renewWindowDays)}"></label>
          <label class="check wide"><input name="allowUserDeleteInvalid" type="checkbox" ${domainConfig(settings.domain).allowUserDeleteInvalid ? 'checked' : ''}> 用户可删除无效域名</label>
          <label class="check wide"><input name="allowDnsEditAfterApproved" type="checkbox" ${domainConfig(settings.domain).allowDnsEditAfterApproved ? 'checked' : ''}> 生效后允许用户修改 DNS</label>
          <button class="btn primary wide" type="submit">保存域名规则</button>
        </form>
      </div>

      <div class="tab-page" data-page="dns">
        <div class="notice">DNS、Zone ID、API Token 当前建议通过 Cloudflare Workers 环境变量和机密管理，不在网页中暴露。</div>
        <div class="table-wrap"><table><thead><tr><th>根域名</th><th>Zone ID</th><th>允许类型</th><th>默认类型</th><th>TTL</th><th>代理</th></tr></thead><tbody>${settings.dns.suffixes.map(s => `<tr><td>${esc(s.suffix)}</td><td><code>${esc(s.zoneId || '未配置')}</code></td><td>${esc((s.allowedTypes || []).join(', '))}</td><td>${esc(s.defaultType)}</td><td>${esc(s.ttl)}</td><td>${s.proxied ? '是' : '否'}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted">对应变量：DNS_SUFFIX、DNS_ZONE_ID、DNS_ALLOWED_TYPES、DNS_DEFAULT_TYPE、DNS_TTL、DNS_PROXIED、CF_API_TOKEN。</p>
      </div>
    </section>`);
    document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('[data-page]').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`[data-page="${btn.dataset.tab}"]`)?.classList.add('active');
    }));
    bindSettingForm('#site-form', 'site', f => Object.fromEntries(f));
    bindSettingForm('#registration-form', 'registration', f => ({ enabled:f.get('enabled')==='on', autoActivate:f.get('autoActivate')==='on' }));
    bindSettingForm('#domain-form', 'domain', f => ({
      defaultQuota:f.get('defaultQuota'),
      validDays:f.get('validDays'),
      renewWindowDays:f.get('renewWindowDays'),
      allowUserDeleteInvalid:f.get('allowUserDeleteInvalid')==='on',
      allowDnsEditAfterApproved:f.get('allowDnsEditAfterApproved')==='on',
    }));
  } catch (error) { toast(error.message, 'error'); }
}
function bindSettingForm(selector, group, mapper) {
  const form = document.querySelector(selector);
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      const { settings } = await api(`/api/admin/settings/${group}`, { method:'PUT', body:mapper(new FormData(form)) });
      state.config.site = settings.site;
      state.config.registration = settings.registration;
      state.config.domain = domainConfig(settings.domain);
      applyTheme();
      toast('设置已保存', 'success');
      btn.disabled = false;
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
}

async function mountTurnstile(selector, action) {
  const config = state.config.turnstile || {};
  if (!window.turnstile || !config.siteKey) return;
  const el = document.querySelector(selector);
  if (!el) return;
  state.widgetId = window.turnstile.render(el, { sitekey: config.siteKey, action });
}
function turnstileToken() {
  if (window.turnstile && state.widgetId !== null) return window.turnstile.getResponse(state.widgetId);
  return '';
}
function resetTurnstile() {
  if (window.turnstile && state.widgetId !== null) window.turnstile.reset(state.widgetId);
}

init();
