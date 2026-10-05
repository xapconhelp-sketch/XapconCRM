import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function PasswordRecoveryView({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8 || password !== confirmation) {
      setError('Usa al menos 8 caracteres y escribe la misma contraseña en ambos campos.');
      return;
    }
    setSaving(true); setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      onComplete();
    } catch (error) { setError((error as Error).message); }
    finally { setSaving(false); }
  };
  return <div className="min-h-screen flex items-center justify-center bg-[#F5F7F8] p-6">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm space-y-5">
      <h1 className="text-xl font-bold text-[#17314A]">Crea una nueva contraseña</h1>
      <label className="block text-sm">Nueva contraseña<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label>
      <label className="block text-sm">Confirma la contraseña<input type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={saving} className="w-full rounded-xl bg-[#17314A] p-3 font-semibold text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar y continuar'}</button>
    </form>
  </div>;
}
