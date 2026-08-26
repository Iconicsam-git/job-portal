import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const AppContext = createContext()

export const AppContextProvider = (props) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const [searchFilter, setSearchFilter] = useState({
        title: '',
        location: ''
    })

    const [isSearched, setIsSearched] = useState(false)

    const [jobs, setJobs] = useState([])
    const [jobsLoading, setJobsLoading] = useState(true)

    const [showRecruiterLogin, setShowRecruiterLogin] = useState(false)
    const [showUserLogin, setShowUserLogin] = useState(false)

    const [companyToken, setCompanyToken] = useState(null)
    const [companyData, setCompanyData] = useState(null)

    const [userToken, setUserToken] = useState(null)
    const [userData, setUserData] = useState(null)
    const [userApplications, setUserApplications] = useState([])

    // Function to Fetch Jobs
    const fetchJobs = async () => {
        setJobsLoading(true)
        try {

            const { data } = await axios.get(backendUrl + '/api/jobs')

            if (data.success) {
                setJobs(data.jobs)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        } finally {
            setJobsLoading(false)
        }
    }

    // Function to Fetch Company Data
    const fetchCompanyData = async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/company/company', { headers: { token: companyToken } })

            if (data.success) {
                setCompanyData(data.company)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        }
    }

    // Function to Fetch User Data
    const fetchUserData = async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/users/user',
                { headers: { Authorization: `Bearer ${userToken}` } })

            if (data.success) {
                setUserData(data.user)
            } else (
                toast.error(data.message)
            )

        } catch (error) {
            toast.error(error.message)
        }
    }

    // Function to Fetch User's Applied Applications
    const fetchUserApplications = async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/users/applications',
                { headers: { Authorization: `Bearer ${userToken}` } }
            )
            if (data.success) {
                setUserApplications(data.applications)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        }
    }

    // Function to Log User Out
    const logoutUser = () => {
        setUserToken(null)
        setUserData(null)
        setUserApplications([])
        localStorage.removeItem('userToken')
    }

    // Retrive Company & User Tokens From LocalStorage
    useEffect(() => {
        fetchJobs()

        const storedCompanyToken = localStorage.getItem('companyToken')

        if (storedCompanyToken) {
            setCompanyToken(storedCompanyToken)
        }

        const storedUserToken = localStorage.getItem('userToken')

        if (storedUserToken) {
            setUserToken(storedUserToken)
        }

    }, [])

    // Fetch Company Data if Company Token is Available
    useEffect(() => {
        if (companyToken) {
            fetchCompanyData()
        }
    }, [companyToken])

    // Fetch User's Applications & Data if User Token is Available
    useEffect(() => {
        if (userToken) {
            fetchUserData()
            fetchUserApplications()
        }
    }, [userToken])

    const value = {
        setSearchFilter, searchFilter,
        isSearched, setIsSearched,
        jobs, setJobs,
        jobsLoading,
        showRecruiterLogin, setShowRecruiterLogin,
        showUserLogin, setShowUserLogin,
        companyToken, setCompanyToken,
        companyData, setCompanyData,
        backendUrl,
        userToken, setUserToken,
        userData, setUserData,
        userApplications, setUserApplications,
        fetchUserData,
        fetchUserApplications,
        logoutUser,

    }

    return (<AppContext.Provider value={value}>
        {props.children}
    </AppContext.Provider>)

}