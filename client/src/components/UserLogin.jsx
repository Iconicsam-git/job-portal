import { useContext, useEffect, useRef, useState } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const UserLogin = () => {

    const [state, setState] = useState('Login')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)

    const googleButtonRef = useRef(null)

    const { setShowUserLogin, backendUrl, setUserToken, setUserData } = useContext(AppContext)

    const handleGoogleCredential = async (response) => {

        setIsGoogleSubmitting(true)

        try {

            const { data } = await axios.post(backendUrl + '/api/users/google', { credential: response.credential })

            if (data.success) {
                setUserData(data.user)
                setUserToken(data.token)
                localStorage.setItem('userToken', data.token)
                toast.success('Logged in successfully')
                setShowUserLogin(false)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        } finally {
            setIsGoogleSubmitting(false)
        }

    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()

        setIsSubmitting(true)

        try {

            if (state === "Login") {

                const { data } = await axios.post(backendUrl + '/api/users/login', { email, password })

                if (data.success) {
                    setUserData(data.user)
                    setUserToken(data.token)
                    localStorage.setItem('userToken', data.token)
                    toast.success('Logged in successfully')
                    setShowUserLogin(false)
                } else {
                    toast.error(data.message)
                }

            } else if (state === "Send OTP") {

                const { data } = await axios.post(backendUrl + '/api/users/send-reset-otp', { email })

                if (data.success) {
                    toast.success(data.message)
                    setState('Reset Password')
                } else {
                    toast.error(data.message)
                }

            } else if (state === "Reset Password") {

                const { data } = await axios.post(backendUrl + '/api/users/reset-password-otp', { email, otp, newPassword: password })

                if (data.success) {
                    toast.success(data.message)
                    setOtp('')
                    setPassword('')
                    setState('Login')
                } else {
                    toast.error(data.message)
                }

            } else {

                const { data } = await axios.post(backendUrl + '/api/users/register', { name, email, password })

                if (data.success) {
                    setUserData(data.user)
                    setUserToken(data.token)
                    localStorage.setItem('userToken', data.token)
                    toast.success('Account created successfully')
                    setShowUserLogin(false)
                } else {
                    toast.error(data.message)
                }

            }

        } catch (error) {
            toast.error(error.message)
        } finally {
            setIsSubmitting(false)
        }

    }

    useEffect(() => {
        document.body.style.overflow = 'hidden'

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    useEffect(() => {

        let attempts = 0

        const renderGoogleButton = () => {

            if (window.google && googleButtonRef.current) {

                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: handleGoogleCredential
                })

                googleButtonRef.current.innerHTML = ''

                window.google.accounts.id.renderButton(googleButtonRef.current, {
                    theme: 'outline',
                    size: 'large',
                    width: 320,
                    text: state === 'Login' ? 'signin_with' : 'signup_with'
                })

                return
            }

            attempts += 1

            if (attempts < 20) {
                setTimeout(renderGoogleButton, 150)
            }

        }

        renderGoogleButton()

    }, [state])

    return (
        <div className='absolute top-0 left-0 right-0 bottom-0 z-10 backdrop-blur-sm bg-black/30 flex justify-center items-center'>
            <form onSubmit={onSubmitHandler} className='relative bg-white p-10 rounded-xl text-slate-500'>
                <h1 className='text-center text-2xl text-neutral-700 font-medium'>User {state === 'Send OTP' ? 'Reset Password' : state}</h1>
                <p className='text-sm'>
                    {state === 'Send OTP' 
                        ? 'Enter your email to receive a verification code' 
                        : state === 'Reset Password' 
                            ? 'Enter verification code & new password' 
                            : 'Welcome back! Please sign in to continue'}
                </p>

                {state === 'Sign Up' && (
                    <div className='border px-4 py-2 flex items-center gap-2 rounded-full mt-5'>
                        <img src={assets.person_icon} alt="" />
                        <input className='outline-none text-sm' onChange={e => setName(e.target.value)} value={name} type="text" placeholder='Full Name' required />
                    </div>
                )}

                <div className='border px-4 py-2 flex items-center gap-2 rounded-full mt-5'>
                    <img src={assets.email_icon} alt="" />
                    <input className='outline-none text-sm' onChange={e => setEmail(e.target.value)} value={email} type="email" placeholder='Email Id' required readOnly={state === 'Reset Password'} />
                </div>

                {state === 'Reset Password' && (
                    <div className='border px-4 py-2 flex items-center gap-2 rounded-full mt-5'>
                        <img src={assets.lock_icon} alt="" />
                        <input className='outline-none text-sm' onChange={e => setOtp(e.target.value)} value={otp} type="text" placeholder='6-Digit OTP Code' required />
                    </div>
                )}

                {state !== 'Send OTP' && (
                    <div className='border px-4 py-2 flex items-center gap-2 rounded-full mt-5'>
                        <img src={assets.lock_icon} alt="" />
                        <input className='outline-none text-sm' onChange={e => setPassword(e.target.value)} value={password} type="password" placeholder={state === 'Reset Password' ? 'New Password' : 'Password'} required />
                    </div>
                )}

                {state === "Login" && <p onClick={() => setState("Send OTP")} className='text-sm text-blue-600 mt-4 cursor-pointer'>Forgot password?</p>}

                <button type='submit' disabled={isSubmitting} className='bg-blue-600 w-full text-white py-2 rounded-full mt-4 disabled:opacity-60 flex items-center justify-center gap-2'>
                    {isSubmitting && <span className='w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin'></span>}
                    {isSubmitting 
                        ? 'Please wait...' 
                        : state === 'Login' 
                            ? 'login' 
                            : state === 'Sign Up' 
                                ? 'create account' 
                                : state === 'Send OTP' 
                                    ? 'send verification code' 
                                    : 'verify & reset password'}
                </button>

                {
                    state === 'Login'
                        ? <p className='mt-5 text-center'>Don't have an account? <span className='text-blue-600 cursor-pointer' onClick={() => setState("Sign Up")}>Sign Up</span></p>
                        : state === 'Sign Up'
                            ? <p className='mt-5 text-center'>Already have an account? <span className='text-blue-600 cursor-pointer' onClick={() => setState("Login")}>Login</span></p>
                            : <p className='mt-5 text-center'>Remember your password? <span className='text-blue-600 cursor-pointer' onClick={() => setState("Login")}>Login</span></p>
                }

                <div className='flex items-center gap-3 my-4'>
                    <div className='flex-1 h-px bg-gray-200'></div>
                    <p className='text-xs text-gray-400'>OR</p>
                    <div className='flex-1 h-px bg-gray-200'></div>
                </div>

                <div className='relative flex justify-center min-h-10'>
                    <div ref={googleButtonRef} className={isGoogleSubmitting ? 'invisible' : ''}></div>
                    {isGoogleSubmitting && (
                        <span className='absolute inset-0 flex items-center justify-center'>
                            <span className='w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin'></span>
                        </span>
                    )}
                </div>

                <img onClick={e => setShowUserLogin(false)} className='absolute top-5 right-5 cursor-pointer' src={assets.cross_icon} alt="" />

            </form>
        </div>
    )
}

export default UserLogin
