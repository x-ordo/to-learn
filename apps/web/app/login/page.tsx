'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, me } from '../../lib/api/authClient';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 이미 로그인되어 있으면 chat으로 이동
    me().then((resp) => {
      if (resp) router.replace('/chat');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ name: name.trim(), password });
      router.replace('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: '64px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>로그인</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>회원가입 없이 이름과 비밀번호만으로 로그인합니다.</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>이름</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            required
            minLength={1}
            maxLength={50}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            minLength={4}
            maxLength={100}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>
        {error && (
          <div style={{ color: '#c00', fontSize: 14 }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 16px',
            background: '#111',
            color: '#fff',
            borderRadius: 10,
            border: 0,
            fontWeight: 600
          }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </main>
  );
}

