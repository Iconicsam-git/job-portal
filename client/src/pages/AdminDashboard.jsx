import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const { backendUrl, adminToken, logoutAdmin } = useContext(AppContext);
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'companies' | 'jobs' | 'email' | 'maintenance'
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Password Reset Modal State
    const [resetModal, setResetModal] = useState({ open: false, targetType: 'user', targetId: '', targetEmail: '' });
    const [newPassword, setNewPassword] = useState('');
    const [sendEmailNotify, setSendEmailNotify] = useState(true);

    // Direct Email Modal State
    const [emailModal, setEmailModal] = useState({ open: false, recipientEmail: '', subject: '', message: '' });
    const [emailSubmitting, setEmailSubmitting] = useState(false);

    // DB Maintenance Log Output
    const [maintenanceLogs, setMaintenanceLogs] = useState([]);

    const getHeaders = () => ({ headers: { admintoken: adminToken } });

    // Fetch Overview Stats
    const fetchStats = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/stats', getHeaders());
            if (data.success) {
                setStats(data.stats);
            } else {
                toast.error(data.message);
                if (data.message.includes('authorized') || data.message.includes('expired')) {
                    logoutAdmin();
                    navigate('/');
                }
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Fetch Users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/users', getHeaders());
            if (data.success) {
                setUsers(data.users);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Companies
    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/companies', getHeaders());
            if (data.success) {
                setCompanies(data.companies);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Jobs
    const fetchJobsList = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/jobs', getHeaders());
            if (data.success) {
                setJobs(data.jobs);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!adminToken) {
            toast.info('Please sign in as Admin to access the dashboard');
            navigate('/');
            return;
        }
        fetchStats();
    }, [adminToken]);

    useEffect(() => {
        if (!adminToken) return;
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'companies') fetchCompanies();
        if (activeTab === 'jobs') fetchJobsList();
    }, [activeTab]);

    // Handle User Delete
    const handleDeleteUser = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete user "${name}"? This action is irreversible.`)) return;
        try {
            const { data } = await axios.delete(backendUrl + `/api/admin/user/${id}`, getHeaders());
            if (data.success) {
                toast.success(data.message);
                fetchUsers();
                fetchStats();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Handle Company Delete
    const handleDeleteCompany = async (id, name) => {
        if (!window.confirm(`Delete company "${name}" and all associated jobs/applications?`)) return;
        try {
            const { data } = await axios.delete(backendUrl + `/api/admin/company/${id}`, getHeaders());
            if (data.success) {
                toast.success(data.message);
                fetchCompanies();
                fetchStats();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Handle Job Delete
    const handleDeleteJob = async (id, title) => {
        if (!window.confirm(`Delete job listing "${title}"?`)) return;
        try {
            const { data } = await axios.delete(backendUrl + `/api/admin/job/${id}`, getHeaders());
            if (data.success) {
                toast.success(data.message);
                fetchJobsList();
                fetchStats();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Execute Password Reset
    const handleExecuteResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        try {
            const { data } = await axios.post(
                backendUrl + '/api/admin/reset-password',
                {
                    targetType: resetModal.targetType,
                    targetId: resetModal.targetId,
                    newPassword,
                    sendEmailNotification: sendEmailNotify
                },
                getHeaders()
            );

            if (data.success) {
                toast.success(data.message);
                setResetModal({ open: false, targetType: 'user', targetId: '', targetEmail: '' });
                setNewPassword('');
                fetchStats();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Execute Direct Email Dispatch
    const handleSendDirectEmail = async (e) => {
        e.preventDefault();
        setEmailSubmitting(true);
        try {
            const { data } = await axios.post(
                backendUrl + '/api/admin/send-email',
                {
                    recipientEmail: emailModal.recipientEmail,
                    subject: emailModal.subject,
                    message: emailModal.message
                },
                getHeaders()
            );

            if (data.success) {
                toast.success(data.message);
                setEmailModal({ open: false, recipientEmail: '', subject: '', message: '' });
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setEmailSubmitting(false);
        }
    };

    // Execute Maintenance Action
    const handleRunMaintenance = async (action, actionLabel) => {
        try {
            const { data } = await axios.post(
                backendUrl + '/api/admin/maintenance',
                { action },
                getHeaders()
            );

            if (data.success) {
                toast.success(`Action "${actionLabel}" executed successfully`);
                const timestamp = new Date().toLocaleTimeString();
                const logEntry = `[${timestamp}] SUCCESS - ${actionLabel}: ${JSON.stringify(data.details)}`;
                setMaintenanceLogs(prev => [logEntry, ...prev]);
                fetchStats();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className='min-h-screen bg-slate-50 flex flex-col font-sans'>
            {/* Admin Header */}
            <header className='bg-slate-900 text-white border-b border-slate-800 py-4 px-6 sm:px-10 flex items-center justify-between shadow-md'>
                <div className='flex items-center gap-3'>
                    <div className='w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30'>
                        ⚡
                    </div>
                    <div>
                        <h1 className='text-lg font-bold text-slate-100 leading-tight'>Admin Control Center</h1>
                        <p className='text-xs text-slate-400'>Job Portal System Administration Suite</p>
                    </div>
                </div>
                <div className='flex items-center gap-4'>
                    <span className='hidden sm:inline-block text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-medium'>
                        ● System Active
                    </span>
                    <button
                        onClick={() => {
                            logoutAdmin();
                            navigate('/');
                            toast.success('Admin session terminated');
                        }}
                        className='text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm'
                    >
                        Sign Out Admin
                    </button>
                </div>
            </header>

            {/* Dashboard Container */}
            <div className='flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6'>
                {/* Sidebar Navigation */}
                <aside className='w-full md:w-64 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm h-fit'>
                    <div className='text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3'>
                        Management Tabs
                    </div>
                    <nav className='space-y-1.5'>
                        {[
                            { id: 'overview', icon: '📊', label: 'Overview & Metrics' },
                            { id: 'users', icon: '👥', label: 'Candidates (Users)' },
                            { id: 'companies', icon: '🏢', label: 'Employers (Companies)' },
                            { id: 'jobs', icon: '💼', label: 'Job Listings' },
                            { id: 'email', icon: '📧', label: 'Email & Recovery' },
                            { id: 'maintenance', icon: '🧹', label: 'DB Maintenance' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className='flex-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[600px]'>
                    {/* TAB 1: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div>
                            <div className='flex items-center justify-between mb-6 pb-4 border-b border-slate-100'>
                                <div>
                                    <h2 className='text-xl font-bold text-slate-800'>System Overview & Performance</h2>
                                    <p className='text-xs text-slate-500'>Real-time summary metrics across database collections</p>
                                </div>
                                <button
                                    onClick={fetchStats}
                                    className='text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200 transition-colors'
                                >
                                    🔄 Refresh Metrics
                                </button>
                            </div>

                            {stats ? (
                                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8'>
                                    <div className='bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl'>
                                        <div className='text-indigo-600 text-2xl mb-1'>👥</div>
                                        <div className='text-3xl font-extrabold text-slate-800'>{stats.totalUsers}</div>
                                        <div className='text-xs font-semibold text-slate-500 uppercase mt-1'>Registered Candidates</div>
                                    </div>

                                    <div className='bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl'>
                                        <div className='text-emerald-600 text-2xl mb-1'>🏢</div>
                                        <div className='text-3xl font-extrabold text-slate-800'>{stats.totalCompanies}</div>
                                        <div className='text-xs font-semibold text-slate-500 uppercase mt-1'>Corporate Employers</div>
                                    </div>

                                    <div className='bg-blue-50/50 border border-blue-100 p-5 rounded-2xl'>
                                        <div className='text-blue-600 text-2xl mb-1'>💼</div>
                                        <div className='text-3xl font-extrabold text-slate-800'>{stats.totalJobs} <span className='text-xs font-normal text-slate-500'>({stats.activeJobs} Visible)</span></div>
                                        <div className='text-xs font-semibold text-slate-500 uppercase mt-1'>Total Job Vacancies</div>
                                    </div>

                                    <div className='bg-violet-50/50 border border-violet-100 p-5 rounded-2xl'>
                                        <div className='text-violet-600 text-2xl mb-1'>📄</div>
                                        <div className='text-3xl font-extrabold text-slate-800'>{stats.totalApplications}</div>
                                        <div className='text-xs font-semibold text-slate-500 uppercase mt-1'>Submitted Applications</div>
                                    </div>

                                    <div className='bg-amber-50/50 border border-amber-100 p-5 rounded-2xl'>
                                        <div className='text-amber-600 text-2xl mb-1'>🔑</div>
                                        <div className='text-3xl font-extrabold text-slate-800'>{stats.pendingOtps}</div>
                                        <div className='text-xs font-semibold text-slate-500 uppercase mt-1'>Active Password Reset OTPs</div>
                                    </div>

                                    <div className='bg-slate-50 border border-slate-200 p-5 rounded-2xl'>
                                        <div className='text-slate-600 text-2xl mb-1'>🩺</div>
                                        <div className='text-xl font-bold text-emerald-600'>{stats.systemStatus}</div>
                                        <div className='text-xs font-semibold text-slate-500 uppercase mt-1'>Database Connection Health</div>
                                    </div>
                                </div>
                            ) : (
                                <div className='py-20 text-center text-slate-400'>Loading metrics...</div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: USERS */}
                    {activeTab === 'users' && (
                        <div>
                            <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4'>
                                <div>
                                    <h2 className='text-xl font-bold text-slate-800'>Candidate User Management</h2>
                                    <p className='text-xs text-slate-500'>Manage candidate accounts, trigger password resets, or purge records</p>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className='px-3.5 py-1.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500'
                                />
                            </div>

                            {loading ? (
                                <div className='py-20 text-center text-slate-400'>Loading candidates...</div>
                            ) : (
                                <div className='overflow-x-auto'>
                                    <table className='w-full text-left text-sm text-slate-600'>
                                        <thead className='bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase'>
                                            <tr>
                                                <th className='p-3'>Candidate Name</th>
                                                <th className='p-3'>Email Address</th>
                                                <th className='p-3'>Resume</th>
                                                <th className='p-3 text-right'>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className='divide-y divide-slate-100'>
                                            {users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
                                                <tr key={user._id} className='hover:bg-slate-50/80 transition-colors'>
                                                    <td className='p-3 font-medium text-slate-800 flex items-center gap-2.5'>
                                                        <img src={user.image || 'https://via.placeholder.com/40'} className='w-8 h-8 rounded-full object-cover border' alt="" />
                                                        {user.name}
                                                    </td>
                                                    <td className='p-3 text-slate-600'>{user.email}</td>
                                                    <td className='p-3'>
                                                        {user.resume ? (
                                                            <a href={user.resume} target="_blank" rel="noreferrer" className='text-indigo-600 hover:underline text-xs font-medium'>
                                                                📄 View PDF
                                                            </a>
                                                        ) : (
                                                            <span className='text-xs text-slate-400'>Not uploaded</span>
                                                        )}
                                                    </td>
                                                    <td className='p-3 text-right space-x-2'>
                                                        <button
                                                            onClick={() => setResetModal({ open: true, targetType: 'user', targetId: user._id, targetEmail: user.email })}
                                                            className='text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-medium transition-colors'
                                                        >
                                                            🔑 Reset Password
                                                        </button>
                                                        <button
                                                            onClick={() => setEmailModal({ open: true, recipientEmail: user.email, subject: 'Administrative Notice regarding your Job Portal account', message: `Dear ${user.name},\n\n` })}
                                                            className='text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-medium transition-colors'
                                                        >
                                                            📧 Email
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user._id, user.name)}
                                                            className='text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-lg font-medium transition-colors'
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: COMPANIES */}
                    {activeTab === 'companies' && (
                        <div>
                            <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4'>
                                <div>
                                    <h2 className='text-xl font-bold text-slate-800'>Employer Company Management</h2>
                                    <p className='text-xs text-slate-500'>Manage corporate recruiter accounts and credentials</p>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search company or email..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className='px-3.5 py-1.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500'
                                />
                            </div>

                            {loading ? (
                                <div className='py-20 text-center text-slate-400'>Loading employers...</div>
                            ) : (
                                <div className='overflow-x-auto'>
                                    <table className='w-full text-left text-sm text-slate-600'>
                                        <thead className='bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase'>
                                            <tr>
                                                <th className='p-3'>Company</th>
                                                <th className='p-3'>Corporate Email</th>
                                                <th className='p-3 text-right'>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className='divide-y divide-slate-100'>
                                            {companies.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase())).map(comp => (
                                                <tr key={comp._id} className='hover:bg-slate-50/80 transition-colors'>
                                                    <td className='p-3 font-medium text-slate-800 flex items-center gap-2.5'>
                                                        <img src={comp.image} className='w-8 h-8 rounded-lg object-contain border p-0.5' alt="" />
                                                        {comp.name}
                                                    </td>
                                                    <td className='p-3 text-slate-600'>{comp.email}</td>
                                                    <td className='p-3 text-right space-x-2'>
                                                        <button
                                                            onClick={() => setResetModal({ open: true, targetType: 'company', targetId: comp._id, targetEmail: comp.email })}
                                                            className='text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-medium transition-colors'
                                                        >
                                                            🔑 Reset Password
                                                        </button>
                                                        <button
                                                            onClick={() => setEmailModal({ open: true, recipientEmail: comp.email, subject: 'Employer Support Notice', message: `Dear Hiring Team at ${comp.name},\n\n` })}
                                                            className='text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-medium transition-colors'
                                                        >
                                                            📧 Email
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCompany(comp._id, comp.name)}
                                                            className='text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-lg font-medium transition-colors'
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: JOBS */}
                    {activeTab === 'jobs' && (
                        <div>
                            <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4'>
                                <div>
                                    <h2 className='text-xl font-bold text-slate-800'>Platform Job Vacancies</h2>
                                    <p className='text-xs text-slate-500'>Inspect and moderate job postings published across companies</p>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search job title or location..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className='px-3.5 py-1.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500'
                                />
                            </div>

                            {loading ? (
                                <div className='py-20 text-center text-slate-400'>Loading job listings...</div>
                            ) : (
                                <div className='overflow-x-auto'>
                                    <table className='w-full text-left text-sm text-slate-600'>
                                        <thead className='bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase'>
                                            <tr>
                                                <th className='p-3'>Job Title</th>
                                                <th className='p-3'>Company</th>
                                                <th className='p-3'>Location</th>
                                                <th className='p-3'>Visibility</th>
                                                <th className='p-3 text-right'>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className='divide-y divide-slate-100'>
                                            {jobs.filter(j => j.title.toLowerCase().includes(searchTerm.toLowerCase()) || j.location.toLowerCase().includes(searchTerm.toLowerCase())).map(job => (
                                                <tr key={job._id} className='hover:bg-slate-50/80 transition-colors'>
                                                    <td className='p-3 font-semibold text-slate-800'>{job.title}</td>
                                                    <td className='p-3 text-slate-600'>{job.companyId?.name || 'N/A'}</td>
                                                    <td className='p-3 text-slate-500'>{job.location}</td>
                                                    <td className='p-3'>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${job.visible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                                                            {job.visible ? '● Visible' : 'Hidden'}
                                                        </span>
                                                    </td>
                                                    <td className='p-3 text-right'>
                                                        <button
                                                            onClick={() => handleDeleteJob(job._id, job.title)}
                                                            className='text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-lg font-medium transition-colors'
                                                        >
                                                            🗑️ Remove Listing
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 5: EMAIL & RECOVERY */}
                    {activeTab === 'email' && (
                        <div>
                            <div className='mb-6 pb-4 border-b border-slate-100'>
                                <h2 className='text-xl font-bold text-slate-800'>Email & Password Recovery Center</h2>
                                <p className='text-xs text-slate-500'>Send system notices or dispatch credentials directly via SMTP Nodemailer</p>
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                {/* Password Recovery Card */}
                                <div className='border border-slate-200 rounded-2xl p-5 bg-slate-50/50'>
                                    <h3 className='font-bold text-slate-800 mb-2 flex items-center gap-2'>
                                        <span>🔑</span> Instant Password Reset
                                    </h3>
                                    <p className='text-xs text-slate-500 mb-4'>
                                        Directly update password for any candidate or recruiter.
                                    </p>

                                    <button
                                        onClick={() => setResetModal({ open: true, targetType: 'user', targetId: '', targetEmail: '' })}
                                        className='w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors shadow-sm'
                                    >
                                        Launch Password Reset Form
                                    </button>
                                </div>

                                {/* Direct Email Card */}
                                <div className='border border-slate-200 rounded-2xl p-5 bg-slate-50/50'>
                                    <h3 className='font-bold text-slate-800 mb-2 flex items-center gap-2'>
                                        <span>📧</span> Dispatch System Email
                                    </h3>
                                    <p className='text-xs text-slate-500 mb-4'>
                                        Send custom messages directly to any user or company email address.
                                    </p>

                                    <button
                                        onClick={() => setEmailModal({ open: true, recipientEmail: '', subject: '', message: '' })}
                                        className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors shadow-sm'
                                    >
                                        Compose Administrative Email
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 6: MAINTENANCE */}
                    {activeTab === 'maintenance' && (
                        <div>
                            <div className='mb-6 pb-4 border-b border-slate-100'>
                                <h2 className='text-xl font-bold text-slate-800'>Database Maintenance Suite</h2>
                                <p className='text-xs text-slate-500'>Execute background database cleaning, token purging, and health diagnostics</p>
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
                                <button
                                    onClick={() => handleRunMaintenance('purgeExpiredOtps', 'Purge Expired Password OTPs')}
                                    className='p-4 border border-slate-200 rounded-2xl hover:border-amber-400 hover:bg-amber-50/30 text-left transition-all group'
                                >
                                    <div className='text-2xl mb-2'>🧹</div>
                                    <div className='font-bold text-slate-800 text-sm group-hover:text-amber-700'>Purge Expired OTPs</div>
                                    <div className='text-xs text-slate-400 mt-1'>Clears expired password reset tokens from MongoDB</div>
                                </button>

                                <button
                                    onClick={() => handleRunMaintenance('cleanOrphanedApplications', 'Prune Orphaned Applications')}
                                    className='p-4 border border-slate-200 rounded-2xl hover:border-rose-400 hover:bg-rose-50/30 text-left transition-all group'
                                >
                                    <div className='text-2xl mb-2'>🔗</div>
                                    <div className='font-bold text-slate-800 text-sm group-hover:text-rose-700'>Prune Orphaned Data</div>
                                    <div className='text-xs text-slate-400 mt-1'>Removes applications associated with deleted jobs/users</div>
                                </button>

                                <button
                                    onClick={() => handleRunMaintenance('verifyDatabaseHealth', 'Verify Database Health')}
                                    className='p-4 border border-slate-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/30 text-left transition-all group'
                                >
                                    <div className='text-2xl mb-2'>🩺</div>
                                    <div className='font-bold text-slate-800 text-sm group-hover:text-emerald-700'>DB Health Check</div>
                                    <div className='text-xs text-slate-400 mt-1'>Pings database and returns total collection document counts</div>
                                </button>
                            </div>

                            {/* Logs Console */}
                            <div className='bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-xs shadow-inner min-h-[250px]'>
                                <div className='text-slate-400 uppercase font-bold text-[10px] tracking-wider mb-2 pb-2 border-b border-slate-800 flex justify-between items-center'>
                                    <span>Maintenance Routine Activity Console</span>
                                    <button onClick={() => setMaintenanceLogs([])} className='hover:text-white'>Clear Output</button>
                                </div>
                                {maintenanceLogs.length === 0 ? (
                                    <div className='text-slate-500 italic py-6 text-center'>No maintenance commands executed in this session yet.</div>
                                ) : (
                                    <div className='space-y-2 max-h-[300px] overflow-y-auto'>
                                        {maintenanceLogs.map((log, idx) => (
                                            <div key={idx} className='text-emerald-400 border-b border-slate-800/50 pb-1.5 break-all'>
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* PASSWORD RESET MODAL */}
            {resetModal.open && (
                <div className='fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4'>
                    <div className='bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100'>
                        <h3 className='text-lg font-bold text-slate-800 mb-1'>Execute Administrative Password Reset</h3>
                        <p className='text-xs text-slate-500 mb-4'>Overwrites account password directly in MongoDB</p>

                        <form onSubmit={handleExecuteResetPassword} className='space-y-4'>
                            <div>
                                <label className='block text-xs font-semibold text-slate-500 mb-1'>Target Account Type</label>
                                <select
                                    value={resetModal.targetType}
                                    onChange={e => setResetModal({ ...resetModal, targetType: e.target.value })}
                                    className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none'
                                >
                                    <option value="user">Candidate (User)</option>
                                    <option value="company">Employer (Company)</option>
                                </select>
                            </div>

                            {!resetModal.targetId && (
                                <div>
                                    <label className='block text-xs font-semibold text-slate-500 mb-1'>Target Account ID</label>
                                    <input
                                        type="text"
                                        placeholder="MongoDB _id string..."
                                        value={resetModal.targetId}
                                        onChange={e => setResetModal({ ...resetModal, targetId: e.target.value })}
                                        className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none'
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className='block text-xs font-semibold text-slate-500 mb-1'>New Temporary Password</label>
                                <input
                                    type="password"
                                    placeholder="Minimum 6 characters..."
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none'
                                    required
                                />
                            </div>

                            <div className='flex items-center gap-2'>
                                <input
                                    type="checkbox"
                                    id="notify"
                                    checked={sendEmailNotify}
                                    onChange={e => setSendEmailNotify(e.target.checked)}
                                    className='rounded accent-indigo-600'
                                />
                                <label htmlFor="notify" className='text-xs text-slate-600 cursor-pointer'>
                                    Send password notification email to recipient
                                </label>
                            </div>

                            <div className='flex gap-3 pt-2'>
                                <button
                                    type="button"
                                    onClick={() => setResetModal({ open: false, targetType: 'user', targetId: '', targetEmail: '' })}
                                    className='flex-1 border border-slate-200 text-slate-600 font-medium py-2 rounded-xl text-sm hover:bg-slate-50'
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className='flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 rounded-xl text-sm shadow-sm'
                                >
                                    Confirm Reset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DIRECT EMAIL MODAL */}
            {emailModal.open && (
                <div className='fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4'>
                    <div className='bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-100'>
                        <h3 className='text-lg font-bold text-slate-800 mb-1'>Compose Administrative Email</h3>
                        <p className='text-xs text-slate-500 mb-4'>Dispatches direct email message via Nodemailer SMTP</p>

                        <form onSubmit={handleSendDirectEmail} className='space-y-4'>
                            <div>
                                <label className='block text-xs font-semibold text-slate-500 mb-1'>Recipient Email Address</label>
                                <input
                                    type="email"
                                    placeholder="user@domain.com"
                                    value={emailModal.recipientEmail}
                                    onChange={e => setEmailModal({ ...emailModal, recipientEmail: e.target.value })}
                                    className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none'
                                    required
                                />
                            </div>

                            <div>
                                <label className='block text-xs font-semibold text-slate-500 mb-1'>Email Subject</label>
                                <input
                                    type="text"
                                    placeholder="Important Administrative Update"
                                    value={emailModal.subject}
                                    onChange={e => setEmailModal({ ...emailModal, subject: e.target.value })}
                                    className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none'
                                    required
                                />
                            </div>

                            <div>
                                <label className='block text-xs font-semibold text-slate-500 mb-1'>Message Content</label>
                                <textarea
                                    rows="5"
                                    placeholder="Write your email body here..."
                                    value={emailModal.message}
                                    onChange={e => setEmailModal({ ...emailModal, message: e.target.value })}
                                    className='w-full border border-slate-200 rounded-xl p-3 text-sm outline-none'
                                    required
                                ></textarea>
                            </div>

                            <div className='flex gap-3 pt-2'>
                                <button
                                    type="button"
                                    onClick={() => setEmailModal({ open: false, recipientEmail: '', subject: '', message: '' })}
                                    className='flex-1 border border-slate-200 text-slate-600 font-medium py-2 rounded-xl text-sm hover:bg-slate-50'
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={emailSubmitting}
                                    className='flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl text-sm shadow-sm disabled:opacity-60 flex items-center justify-center gap-2'
                                >
                                    {emailSubmitting ? 'Sending Email...' : 'Send Message'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
