'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

type AuthMode = 'login' | 'register' | 'forgot';

function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

function inputClassName(disabled?: boolean) {
  return [
    'mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition',
    'placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10',
    disabled ? 'cursor-not-allowed bg-zinc-50 text-zinc-500' : ''
  ]
    .filter(Boolean)
    .join(' ');
}

function TopNavBar({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 bg-white/80 backdrop-blur-md">
      <div className="app-container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, rgb(5 150 105), rgb(14 116 144))'
            }}
          >
            YG
          </span>
          <span className="text-base font-semibold text-zinc-900">此间</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/recap"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 transition-colors hover:bg-zinc-100/70"
          >
            复盘
          </Link>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 transition-colors hover:bg-zinc-100/70"
            onClick={onLogin}
          >
            登录
          </button>
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm text-white transition-colors"
            style={{
              background: 'linear-gradient(135deg, rgb(5 150 105), rgb(14 116 144))'
            }}
            onClick={onRegister}
          >
            注册
          </button>
        </div>
      </div>
    </header>
  );
}

function AuthModal({
  authMode,
  message,
  setModalRef,
  titleId,
  descriptionId,
  modalTitle,
  primaryButtonText,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  registerNickname,
  setRegisterNickname,
  registerEmail,
  setRegisterEmail,
  registerPassword,
  setRegisterPassword,
  forgotEmail,
  setForgotEmail,
  setMessage,
  setAuthMode,
  onClose,
  onSubmit
}: {
  authMode: AuthMode;
  message: { kind: 'ok' | 'error'; text: string } | null;
  setModalRef: (node: HTMLDivElement | null) => void;
  titleId: string;
  descriptionId: string;
  modalTitle: string;
  primaryButtonText: string;
  loginEmail: string;
  setLoginEmail: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  registerNickname: string;
  setRegisterNickname: (value: string) => void;
  registerEmail: string;
  setRegisterEmail: (value: string) => void;
  registerPassword: string;
  setRegisterPassword: (value: string) => void;
  forgotEmail: string;
  setForgotEmail: (value: string) => void;
  setMessage: (next: { kind: 'ok' | 'error'; text: string } | null) => void;
  setAuthMode: (mode: AuthMode) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/20 p-4 md:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={setModalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-[420px] rounded-2xl border border-zinc-200/70 bg-white/90 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.14)] backdrop-blur-xl outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div id={titleId} className="text-sm font-medium text-zinc-950">
              {modalTitle}
            </div>
            <div id={descriptionId} className="mt-1 text-xs text-zinc-500">
              {authMode === 'login'
                ? '使用邮箱与密码登录'
                : authMode === 'register'
                  ? '创建账号后可在多设备同步（后续接入）'
                  : '输入邮箱以接收重置密码邮件'}
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-white hover:text-zinc-800"
            onClick={onClose}
          >
            关闭
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          {authMode === 'login' ? (
            <>
              <label className="block">
                <span className="text-xs font-medium text-zinc-700">邮箱</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className={inputClassName()}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-zinc-700">密码</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  className={inputClassName()}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                />
              </label>
            </>
          ) : null}

          {authMode === 'register' ? (
            <>
              <label className="block">
                <span className="text-xs font-medium text-zinc-700">昵称</span>
                <input
                  type="text"
                  autoComplete="nickname"
                  className={inputClassName()}
                  value={registerNickname}
                  onChange={(e) => setRegisterNickname(e.target.value)}
                  placeholder="怎么称呼你"
                  required
                  maxLength={24}
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-zinc-700">邮箱</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className={inputClassName()}
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-zinc-700">密码</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={inputClassName()}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="至少 6 位"
                  required
                  minLength={6}
                />
              </label>
            </>
          ) : null}

          {authMode === 'forgot' ? (
            <label className="block">
              <span className="text-xs font-medium text-zinc-700">邮箱</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                className={inputClassName()}
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </label>
          ) : null}

          {message ? (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                message.kind === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <button
            type="submit"
            className="h-10 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {primaryButtonText}
          </button>

          <div className="flex items-center justify-between gap-3 text-xs">
            {authMode === 'login' ? (
              <>
                <button
                  type="button"
                  className="text-zinc-500 hover:text-zinc-800"
                  onClick={() => {
                    setMessage(null);
                    setForgotEmail(loginEmail.trim());
                    setAuthMode('forgot');
                  }}
                >
                  忘记密码？
                </button>
                <button
                  type="button"
                  className="text-zinc-500 hover:text-zinc-800"
                  onClick={() => {
                    setMessage(null);
                    setAuthMode('register');
                  }}
                >
                  没有账号？去注册
                </button>
              </>
            ) : null}

            {authMode === 'register' ? (
              <button
                type="button"
                className="ml-auto text-zinc-500 hover:text-zinc-800"
                onClick={() => {
                  setMessage(null);
                  setLoginEmail(registerEmail.trim());
                  setAuthMode('login');
                }}
              >
                已有账号？去登录
              </button>
            ) : null}

            {authMode === 'forgot' ? (
              <button
                type="button"
                className="ml-auto text-zinc-500 hover:text-zinc-800"
                onClick={() => {
                  setMessage(null);
                  setLoginEmail(forgotEmail.trim());
                  setAuthMode('login');
                }}
              >
                返回登录
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TopNav() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const setModalRef = useCallback((node: HTMLDivElement | null) => {
    modalRef.current = node;
  }, []);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerNickname, setRegisterNickname] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');

  const titleId = useId();
  const descriptionId = useId();

  const openAuth = (mode: AuthMode) => {
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMessage(null);
    setAuthMode(mode);
  };

  const closeAuth = () => {
    setAuthMode(null);
    setMessage(null);
  };

  const modalTitle = useMemo(() => {
    if (authMode === 'login') return '登录';
    if (authMode === 'register') return '注册';
    if (authMode === 'forgot') return '找回密码';
    return '';
  }, [authMode]);

  useEffect(() => {
    if (!authMode) return;

    requestAnimationFrame(() => {
      const root = modalRef.current;
      if (!root) return;
      const first =
        root.querySelector<HTMLInputElement>('input:not([disabled]), textarea:not([disabled])') ??
        root.querySelector<HTMLElement>('button:not([disabled])');
      first?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuth();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authMode]);

  useEffect(() => {
    if (authMode) return;
    lastFocusedRef.current?.focus();
  }, [authMode]);

  const primaryButtonText = useMemo(() => {
    if (authMode === 'login') return '登录';
    if (authMode === 'register') return '创建账号';
    if (authMode === 'forgot') return '发送重置邮件';
    return '';
  }, [authMode]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (authMode === 'login') {
      const email = loginEmail.trim();
      if (!email || !loginPassword) {
        setMessage({ kind: 'error', text: '请填写邮箱与密码。' });
        return;
      }
      if (!isValidEmail(email)) {
        setMessage({ kind: 'error', text: '邮箱格式不正确。' });
        return;
      }
      setMessage({ kind: 'ok', text: '登录请求已提交（UI 演示）。' });
      return;
    }

    if (authMode === 'register') {
      const nickname = registerNickname.trim();
      const email = registerEmail.trim();
      if (!nickname || !email || !registerPassword) {
        setMessage({ kind: 'error', text: '请填写昵称、邮箱与密码。' });
        return;
      }
      if (nickname.length > 24) {
        setMessage({ kind: 'error', text: '昵称过长（最多 24 字）。' });
        return;
      }
      if (!isValidEmail(email)) {
        setMessage({ kind: 'error', text: '邮箱格式不正确。' });
        return;
      }
      if (registerPassword.length < 6) {
        setMessage({ kind: 'error', text: '密码至少 6 位。' });
        return;
      }
      setMessage({ kind: 'ok', text: '注册请求已提交（UI 演示）。' });
      return;
    }

    if (authMode === 'forgot') {
      const email = forgotEmail.trim();
      if (!email) {
        setMessage({ kind: 'error', text: '请填写邮箱。' });
        return;
      }
      if (!isValidEmail(email)) {
        setMessage({ kind: 'error', text: '邮箱格式不正确。' });
        return;
      }
      setMessage({ kind: 'ok', text: '已发送重置邮件（UI 演示）。' });
    }
  };

  return (
    <>
      <TopNavBar onLogin={() => openAuth('login')} onRegister={() => openAuth('register')} />

      {authMode ? (
        <AuthModal
          authMode={authMode}
          message={message}
          setModalRef={setModalRef}
          titleId={titleId}
          descriptionId={descriptionId}
          modalTitle={modalTitle}
          primaryButtonText={primaryButtonText}
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          registerNickname={registerNickname}
          setRegisterNickname={setRegisterNickname}
          registerEmail={registerEmail}
          setRegisterEmail={setRegisterEmail}
          registerPassword={registerPassword}
          setRegisterPassword={setRegisterPassword}
          forgotEmail={forgotEmail}
          setForgotEmail={setForgotEmail}
          setMessage={setMessage}
          setAuthMode={setAuthMode}
          onClose={closeAuth}
          onSubmit={onSubmit}
        />
      ) : null}
    </>
  );
}
