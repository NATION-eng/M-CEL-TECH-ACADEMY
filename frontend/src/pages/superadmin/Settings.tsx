import { useState, useEffect } from 'react'
import { Save, Globe, CreditCard, Mail, Shield, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMutation, useQuery } from '@tanstack/react-query'
import api, { settingsAPI } from '../../services/api'

type GeneralSettings = { academyName:string; tagline:string; address:string; email:string; phone:string }
type PaymentSettings = { defaultDepositPercent:string; paystackEnabled:boolean; flutterwaveEnabled:boolean; allowInstallments:boolean }
type NotifSettings = { assignmentReminders:boolean; paymentReminders:boolean; certificateNotifs:boolean; emailNotifications:boolean }
type SecuritySettings = { requireStrongPasswords:boolean; sessionTimeout:string; maxLoginAttempts:string; enableAuditLogs:boolean }

export default function SuperAdminSettings() {
  const [general, setGeneral] = useState<GeneralSettings>({ academyName:'M-CEL TECH ACADEMY', tagline:'Become a Job-Ready Digital Professional', address:'24 Ada George Road, Port Harcourt, Rivers State', email:'contact@mceltech.com', phone:'08161237136' })
  const [payment, setPayment] = useState<PaymentSettings>({ defaultDepositPercent:'60', paystackEnabled:true, flutterwaveEnabled:true, allowInstallments:true })
  const [notif, setNotif] = useState<NotifSettings>({ assignmentReminders:true, paymentReminders:true, certificateNotifs:true, emailNotifications:true })
  const [security, setSecurity] = useState<SecuritySettings>({ requireStrongPasswords:true, sessionTimeout:'60', maxLoginAttempts:'5', enableAuditLogs:true })

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await settingsAPI.get()
      return res.data.data
    },
  })

  useEffect(() => {
    if (!settingsData) return
    if (settingsData.general) setGeneral(g => ({ ...g, ...settingsData.general }))
    if (settingsData.payment) setPayment(p => ({ ...p, ...settingsData.payment, defaultDepositPercent: String(settingsData.payment.defaultDepositPercent ?? p.defaultDepositPercent) }))
    if (settingsData.notifications) setNotif(n => ({ ...n, ...settingsData.notifications }))
    if (settingsData.security) setSecurity(s => ({ ...s, ...settingsData.security, sessionTimeout: String(settingsData.security.sessionTimeout ?? s.sessionTimeout), maxLoginAttempts: String(settingsData.security.maxLoginAttempts ?? s.maxLoginAttempts) }))
  }, [settingsData])

  const saveMut = useMutation({
    mutationFn: (section: string) => api.put('/settings', { section, general, payment, notif, security }),
    onSuccess: (_, section) => toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved`),
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Failed to save settings. Please try again.')
    },
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-white">Platform Settings</h1>
      {settingsLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin"/> Loading current settings...</div>
      )}

      {/* General */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5"><Globe size={16} className="text-brand-400"/><h2 className="font-display font-semibold text-white">General</h2></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Academy Name</label><input className="input" value={general.academyName} onChange={e=>setGeneral({...general,academyName:e.target.value})}/></div>
          <div className="sm:col-span-2"><label className="label">Tagline</label><input className="input" value={general.tagline} onChange={e=>setGeneral({...general,tagline:e.target.value})}/></div>
          <div className="sm:col-span-2"><label className="label">Address</label><input className="input" value={general.address} onChange={e=>setGeneral({...general,address:e.target.value})}/></div>
          <div><label className="label">Contact Email</label><input className="input" value={general.email} onChange={e=>setGeneral({...general,email:e.target.value})}/></div>
          <div><label className="label">Phone</label><input className="input" value={general.phone} onChange={e=>setGeneral({...general,phone:e.target.value})}/></div>
        </div>
        <button className="btn-primary mt-5 text-sm w-full sm:w-auto justify-center" onClick={()=>saveMut.mutate('general')} disabled={saveMut.isPending}>
          {saveMut.isPending ? <Loader2 size={13} className="animate-spin"/> : <><Save size={13}/> Save</>}
        </button>
      </div>

      {/* Payment */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5"><CreditCard size={16} className="text-emerald-400"/><h2 className="font-display font-semibold text-white">Payment Settings</h2></div>
        <div className="space-y-4">
          <div><label className="label">Default Deposit Percentage (min 50%)</label><input type="number" min={50} max={100} className="input max-w-xs" value={payment.defaultDepositPercent} onChange={e=>setPayment({...payment,defaultDepositPercent:e.target.value})}/><p className="text-xs text-slate-500 mt-1">Students must pay at least this % before getting full access.</p></div>
          <div className="space-y-3">
            {([{label:'Paystack enabled',key:'paystackEnabled'},{label:'Flutterwave enabled',key:'flutterwaveEnabled'},{label:'Allow installment payments',key:'allowInstallments'}] as {label:string;key:keyof PaymentSettings}[]).map(item=>(
              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={payment[item.key] as boolean} onChange={e=>setPayment({...payment,[item.key]:e.target.checked})} className="rounded"/>
                <span className="text-sm text-slate-300">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary mt-5 text-sm w-full sm:w-auto justify-center" onClick={()=>saveMut.mutate('payment')} disabled={saveMut.isPending}>
          {saveMut.isPending ? <Loader2 size={13} className="animate-spin"/> : <><Save size={13}/> Save</>}
        </button>
      </div>

      {/* Notifications */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5"><Mail size={16} className="text-cyan-400"/><h2 className="font-display font-semibold text-white">Notifications</h2></div>
        <div className="space-y-3">
          {([{label:'Assignment due reminders',key:'assignmentReminders'},{label:'Payment due reminders',key:'paymentReminders'},{label:'Certificate issuance notifications',key:'certificateNotifs'},{label:'Email notifications (via SMTP)',key:'emailNotifications'}] as {label:string;key:keyof NotifSettings}[]).map(item=>(
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={notif[item.key]} onChange={e=>setNotif({...notif,[item.key]:e.target.checked})} className="rounded"/>
              <span className="text-sm text-slate-300">{item.label}</span>
            </label>
          ))}
        </div>
        <button className="btn-primary mt-5 text-sm w-full sm:w-auto justify-center" onClick={()=>saveMut.mutate('notifications')} disabled={saveMut.isPending}>
          {saveMut.isPending ? <Loader2 size={13} className="animate-spin"/> : <><Save size={13}/> Save</>}
        </button>
      </div>

      {/* Security */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5"><Shield size={16} className="text-amber-400"/><h2 className="font-display font-semibold text-white">Security</h2></div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Session Timeout (minutes)</label><input type="number" className="input" value={security.sessionTimeout} onChange={e=>setSecurity({...security,sessionTimeout:e.target.value})}/></div>
            <div><label className="label">Max Login Attempts</label><input type="number" className="input" value={security.maxLoginAttempts} onChange={e=>setSecurity({...security,maxLoginAttempts:e.target.value})}/></div>
          </div>
          <div className="space-y-3">
            {([{label:'Require strong passwords (min 8 chars, mixed case)',key:'requireStrongPasswords'},{label:'Enable audit logging for all actions',key:'enableAuditLogs'}] as {label:string;key:keyof SecuritySettings}[]).map(item=>(
              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={security[item.key] as boolean} onChange={e=>setSecurity({...security,[item.key]:e.target.checked})} className="rounded"/>
                <span className="text-sm text-slate-300">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary mt-5 text-sm w-full sm:w-auto justify-center" onClick={()=>saveMut.mutate('security')} disabled={saveMut.isPending}>
          {saveMut.isPending ? <Loader2 size={13} className="animate-spin"/> : <><Save size={13}/> Save</>}
        </button>
      </div>
    </div>
  )
}
