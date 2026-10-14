import { useContext, useEffect, useState } from 'react';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { setShowAdminLogin, backendUrl, setAdminToken } = useContext(AppContext);

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data } = await axios.post(backendUrl + '/api/admin/login', { email, password });

            if (data.success) {
                setAdminToken(data.token);
                localStorage.setItem('adminToken', data.token);
                toast.success('Admin authenticated successfully');
                setShowAdminLogin(false);
                navigate('/admin-dashboard');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return (
        <div className='fixed inset-0 z-50 backdrop-blur-sm bg-black/40 flex justify-center items-center p-4'>
            <form onSubmit={onSubmitHandler} className='relative bg-white p-8 sm:p-10 rounded-2xl shadow-2xl text-slate-600 w-full max-w-md border border-slate-100'>
                <div className='flex flex-col items-center mb-6'>
                    <div className='w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl mb-3 shadow-inner'>
                        ⚡
                    </div>
                    <h1 className='text-center text-2xl text-slate-800 font-semibold'>Admin Control Panel</h1>
                    <p className='text-xs text-slate-400 mt-1 text-center'>
                        Sign in with system administrator credentials
                    </p>
                </div>

                <div className='space-y-4'>
                    <div>
                        <label className='block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider'>Admin Email</label>
                        <div className='border border-slate-200 px-4 py-2.5 flex items-center gap-2 rounded-xl focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all'>
                            <img src={assets.email_icon} className='w-4 opacity-50' alt="" />
                            <input
                                className='outline-none text-sm w-full bg-transparent text-slate-700'
                                onChange={e => setEmail(e.target.value)}
                                value={email}
                                type="email"
                                placeholder="admin@jobportal.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className='block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider'>Master Password</label>
                        <div className='border border-slate-200 px-4 py-2.5 flex items-center gap-2 rounded-xl focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all'>
                            <img src={assets.lock_icon} className='w-4 opacity-50' alt="" />
                            <input
                                className='outline-none text-sm w-full bg-transparent text-slate-700'
                                onChange={e => setPassword(e.target.value)}
                                value={password}
                                type="password"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>
                </div>

                <button
                    type='submit'
                    disabled={isSubmitting}
                    className='bg-indigo-600 hover:bg-indigo-700 w-full text-white font-medium py-3 rounded-xl mt-6 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200'
                >
                    {isSubmitting && <span className='w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin'></span>}
                    {isSubmitting ? 'Authenticating Admin...' : 'Authenticate & Access Panel'}
                </button>

                <div className='mt-6 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center'>
                    <p className='text-xs text-slate-400'>
                        Default test login: <code className='text-indigo-600 bg-white px-1.5 py-0.5 rounded border'>admin@jobportal.com</code> / <code className='text-indigo-600 bg-white px-1.5 py-0.5 rounded border'>admin12345</code>
                    </p>
                </div>

                <img
                    onClick={() => setShowAdminLogin(false)}
                    className='absolute top-5 right-5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity'
                    src={assets.cross_icon}
                    alt="Close"
                />
            </form>
        </div>
    );
};

export default AdminLogin;
