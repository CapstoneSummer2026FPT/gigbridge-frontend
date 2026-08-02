import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { adminGetAPI } from '../../../api/adminAPI/GET';
import { adminPostAPI } from '../../../api/adminAPI/POST';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { AccountStatus, UserViolationType, type AdminUserDetail, type EnforcementPayload } from '../../../types/models/AdminPhase1';
import '../styles/admin-phase-one.css';

const labels = ['Active', 'Suspended', 'Banned'];
export default function AdminUserDetailScreen() {
  const { userId = '' } = useParams(); const [data,setData]=useState<AdminUserDetail>(); const [error,setError]=useState(''); const [tab,setTab]=useState('Overview');
  const load=async()=>{const r=await adminGetAPI.getUserDetail(userId); if(r.success&&r.data)setData(r.data); else setError(r.message||'Unable to load user.');};
  useEffect(()=>{void load();},[userId]);
  const enforce=async(action:'warning'|'suspend'|'ban')=>{const reason=window.prompt(`Reason for ${action}`)?.trim(); if(!reason)return; const payload:EnforcementPayload={requestId:crypto.randomUUID(),violationType:UserViolationType.PlatformPolicyViolation,reason}; if(action==='suspend'){const until=window.prompt('Suspension end (UTC ISO date/time)'); if(!until)return; payload.suspendedUntil=new Date(until).toISOString();} const r=await adminPostAPI.enforceUser(userId,action,payload); if(!r.success)setError(r.message||'Action failed.'); else await load();};
  const clear=async(restore:boolean)=>{const reason=window.prompt(`Reason for ${restore?'restore':'clearing suspension'}`)?.trim(); if(!reason)return; const r=restore?await adminPostAPI.restoreUser(userId,reason):await adminPostAPI.clearUserSuspension(userId,reason); if(!r.success)setError(r.message||'Action failed.'); else await load();};
  if(!data)return <main className="admin-phase">{error?<div className="admin-phase__error">{error}</div>:<p>Loading user…</p>}</main>;
  const protectedAdmin=data.role===2;
  return <main className="admin-phase"><div className="admin-phase__header"><div><Link to="/admin/users">← Users</Link><h1><UserProfileLink userId={data.userId} role={data.role}>{data.fullName}</UserProfileLink></h1><p>{data.email}</p></div><span className="admin-phase__badge">{labels[data.accountStatus]} · {data.violationCount} violation(s){data.isFlagged?' · Flagged':''}</span></div>{error&&<div className="admin-phase__error">{error}</div>}
    <div className="admin-phase__tabs">{['Overview','Profile','Account Reports','Violations','Account Enforcement','Wallet Summary','Audit Logs'].map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}</div>
    {tab==='Overview'&&<section className="admin-phase__panel admin-phase__grid"><div className="admin-phase__stat"><small>Role</small>{['Client','Freelancer','Admin'][data.role]}</div><div className="admin-phase__stat"><small>Email verified</small>{data.isEmailVerified?'Yes':'No'}</div><div className="admin-phase__stat"><small>Created</small>{new Date(data.createdAt).toLocaleString()}</div><div className="admin-phase__stat"><small>Subscription</small>{data.subscription?.planName||'None'}</div></section>}
    {tab==='Profile'&&<section className="admin-phase__panel"><h2>{data.profile?.kind||'Profile'}</h2><p>{data.profile?.title||data.profile?.companyName}</p><p>{data.profile?.bio}</p><p>{[...(data.profile?.categories||[]),...(data.profile?.skills||[])].join(', ')||'No taxonomy data'}</p></section>}
    {tab==='Account Reports'&&<section className="admin-phase__panel"><table><tbody>{data.recentReports.map(x=><tr key={x.id}><td><Link to={`/admin/reports/accounts/${x.id}`}>{x.reason}</Link><small>{x.description}</small></td><td>{new Date(x.createdAt).toLocaleString()}</td><td>{x.evidenceCount} evidence</td></tr>)}</tbody></table></section>}
    {tab==='Violations'&&<section className="admin-phase__panel"><table><tbody>{data.recentViolations.map(x=><tr key={x.id}><td>#{x.number}</td><td>{x.reason}<small>{x.description}</small></td><td>{new Date(x.createdAt).toLocaleString()}</td></tr>)}</tbody></table></section>}
    {tab==='Account Enforcement'&&<section className="admin-phase__panel"><p>{protectedAdmin?'Admin accounts are protected from User-management enforcement.':'Every enforcement action requires a reason and is audited.'}</p><div className="admin-phase__actions"><button disabled={protectedAdmin} onClick={()=>enforce('warning')}>Issue warning</button><button disabled={protectedAdmin} onClick={()=>enforce('suspend')}>Suspend</button><button className="danger" disabled={protectedAdmin} onClick={()=>enforce('ban')}>Permanently ban</button><button disabled={protectedAdmin||data.accountStatus!==AccountStatus.Suspended} onClick={()=>clear(false)}>Clear suspension</button><button disabled={protectedAdmin} onClick={()=>clear(true)}>Restore</button></div></section>}
    {tab==='Wallet Summary'&&<section className="admin-phase__panel admin-phase__grid">{Object.entries(data.wallet||{}).map(([k,v])=><div className="admin-phase__stat" key={k}><small>{k}</small>{v}</div>)}</section>}
    {tab==='Audit Logs'&&<section className="admin-phase__panel"><table><tbody>{data.recentAuditLogs.map(x=><tr key={x.id}><td>{x.action}</td><td>{new Date(x.createdAt).toLocaleString()}</td><td><pre>{typeof x.newValues==='string'?x.newValues:JSON.stringify(x.newValues,null,2)}</pre></td></tr>)}</tbody></table></section>}
  </main>;
}
