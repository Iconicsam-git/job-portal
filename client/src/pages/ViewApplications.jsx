import { useContext, useEffect, useState, useMemo } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'

const ViewApplications = () => {
  const { backendUrl, companyToken } = useContext(AppContext)

  const [applicants, setApplicants] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [retryingId, setRetryingId] = useState(null)
  const [rescreeningId, setRescreeningId] = useState(null)
  const [selectedApplicant, setSelectedApplicant] = useState(null)

  // Filters & Sorting state
  const [filterRecommendation, setFilterRecommendation] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [sortBy, setSortBy] = useState('score_desc')
  const [searchQuery, setSearchQuery] = useState('')

  // Confirmation Modal state for important status changes (Under Review, Hired, Rejected)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    applicant: null,
    targetStatus: '',
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmColor: 'bg-blue-600 hover:bg-blue-700'
  })

  // Interview Scheduling Modal state
  const [interviewModal, setInterviewModal] = useState({
    isOpen: false,
    applicant: null,
    interviewDate: '',
    interviewTime: '',
    interviewFormat: 'Online',
    interviewLocation: '',
    interviewNotes: '',
    errors: {}
  })

  // Function to fetch company Job Applications data 
  const fetchCompanyJobApplications = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/company/applicants', {
        headers: { token: companyToken }
      })

      if (data.success) {
        setApplicants(data.applications.reverse())
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Core API caller to update status and send candidate notification
  const executeStatusChange = async (id, status, interviewDetails = null) => {
    setUpdatingId(id)
    try {
      const payload = { id, status }
      if (interviewDetails) {
        payload.interviewDetails = interviewDetails
      }

      const { data } = await axios.post(
        backendUrl + '/api/company/change-status',
        payload,
        { headers: { token: companyToken } }
      )

      if (data.success) {
        if (data.notification?.status === 'Failed') {
          toast.warning(`Status updated to "${status}", but email notification failed: ${data.notification.error}`)
        } else if (data.notification?.status === 'Sent') {
          toast.success(`Application marked as "${status}" and notification email sent to candidate!`)
        } else {
          toast.success(data.message || `Application status updated to "${status}"`)
        }

        await fetchCompanyJobApplications()

        if (selectedApplicant && selectedApplicant._id === id) {
          setSelectedApplicant(prev => prev ? {
            ...prev,
            status,
            interviewDetails: interviewDetails || prev.interviewDetails,
            notificationStatus: data.notification?.status || prev.notificationStatus,
            notificationError: data.notification?.error || ''
          } : null)
        }
      } else {
        toast.error(data.message || 'Failed to update application status')
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message
      toast.error(msg)
    } finally {
      setUpdatingId(null)
    }
  }

  // Opens Confirmation Modal for regular status transitions
  const promptStatusChange = (applicant, targetStatus) => {
    if (targetStatus === 'Shortlisted for Interview') {
      // Open interview scheduling form
      openInterviewModal(applicant)
      return
    }

    let title = ''
    let message = ''
    let confirmText = 'Confirm Change'
    let confirmColor = 'bg-blue-600 hover:bg-blue-700 text-white'

    const candidateName = applicant.userId?.name || 'the candidate'
    const candidateEmail = applicant.userId?.email || 'registered email'
    const jobTitle = applicant.jobId?.title || 'the position'

    if (targetStatus === 'Under Review') {
      title = 'Mark Application as Under Review'
      message = `Move ${candidateName}'s application for "${jobTitle}" to Under Review? An acknowledgment email will be sent to ${candidateEmail}.`
      confirmText = 'Mark Under Review'
      confirmColor = 'bg-blue-600 hover:bg-blue-700 text-white'
    } else if (targetStatus === 'Rejected') {
      title = 'Reject Candidate Application'
      message = `Are you sure you want to reject ${candidateName} for "${jobTitle}"? A polite, professional rejection notification will be automatically delivered to ${candidateEmail}.`
      confirmText = 'Confirm Rejection'
      confirmColor = 'bg-red-600 hover:bg-red-700 text-white'
    } else if (targetStatus === 'Hired') {
      title = 'Mark Candidate as Hired'
      message = `Congratulations! Mark ${candidateName} as Hired for "${jobTitle}"? An official congratulatory confirmation email will be sent to ${candidateEmail}.`
      confirmText = 'Confirm Hire'
      confirmColor = 'bg-emerald-600 hover:bg-emerald-700 text-white'
    }

    setConfirmModal({
      isOpen: true,
      applicant,
      targetStatus,
      title,
      message,
      confirmText,
      confirmColor
    })
  }

  const handleConfirmStatus = async () => {
    const { applicant, targetStatus } = confirmModal
    setConfirmModal(prev => ({ ...prev, isOpen: false }))
    if (applicant && targetStatus) {
      await executeStatusChange(applicant._id, targetStatus)
    }
  }

  // Opens Interview Scheduling Modal
  const openInterviewModal = (applicant) => {
    // Today's date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0]
    const existing = applicant.interviewDetails || {}

    setInterviewModal({
      isOpen: true,
      applicant,
      interviewDate: existing.interviewDate || today,
      interviewTime: existing.interviewTime || '10:00',
      interviewFormat: existing.interviewFormat || 'Online',
      interviewLocation: existing.interviewLocation || '',
      interviewNotes: existing.interviewNotes || '',
      errors: {}
    })
  }

  // Submits Interview Form after validating required fields
  const handleInterviewSubmit = async (e) => {
    e.preventDefault()
    const { applicant, interviewDate, interviewTime, interviewFormat, interviewLocation, interviewNotes } = interviewModal
    const errors = {}

    if (!interviewDate) errors.interviewDate = 'Interview date is required.'
    if (!interviewTime) errors.interviewTime = 'Interview time is required.'
    if (!interviewFormat) errors.interviewFormat = 'Interview format is required.'

    if (interviewFormat === 'Online') {
      if (!interviewLocation || !interviewLocation.trim()) {
        errors.interviewLocation = 'An online meeting link (e.g. Google Meet, Zoom) is required for online interviews.'
      }
    } else if (interviewFormat === 'In-person') {
      if (!interviewLocation || !interviewLocation.trim()) {
        errors.interviewLocation = 'A physical interview location / office address is required for in-person interviews.'
      }
    }

    if (Object.keys(errors).length > 0) {
      setInterviewModal(prev => ({ ...prev, errors }))
      return
    }

    setInterviewModal(prev => ({ ...prev, isOpen: false, errors: {} }))

    await executeStatusChange(applicant._id, 'Shortlisted for Interview', {
      interviewDate,
      interviewTime,
      interviewFormat,
      interviewLocation,
      interviewNotes
    })
  }

  // Retry sending email if SMTP previously failed
  const handleRetryNotification = async (applicationId) => {
    setRetryingId(applicationId)
    try {
      const { data } = await axios.post(
        backendUrl + '/api/company/retry-notification',
        { id: applicationId },
        { headers: { token: companyToken } }
      )

      if (data.success) {
        toast.success(data.message || 'Notification email sent successfully!')
        await fetchCompanyJobApplications()
      } else {
        toast.error(data.message || 'Email delivery failed on retry.')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setRetryingId(null)
    }
  }

  // Trigger Real-Time Re-screening
  const handleRescreen = async (applicationId) => {
    setRescreeningId(applicationId)
    try {
      const { data } = await axios.post(
        backendUrl + '/api/company/rescreen-applicant',
        { applicationId },
        { headers: { token: companyToken } }
      )

      if (data.success) {
        toast.success(data.message)
        await fetchCompanyJobApplications()
        if (selectedApplicant && selectedApplicant._id === applicationId) {
          setSelectedApplicant(prev => ({
            ...prev,
            suitabilityScore: data.suitabilityScore,
            recommendation: data.recommendation,
            matchDetails: data.matchDetails
          }))
        }
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setRescreeningId(null)
    }
  }

  useEffect(() => {
    if (companyToken) {
      fetchCompanyJobApplications()
    }
  }, [companyToken])

  // Computed metrics for recruiter overview
  const validApplicants = useMemo(() => {
    if (!applicants) return []
    return applicants.filter(item => item.jobId && item.userId)
  }, [applicants])

  const metrics = useMemo(() => {
    const total = validApplicants.length
    if (total === 0) {
      return { total: 0, shortlisted: 0, underReview: 0, hired: 0, rejected: 0, avgScore: 0 }
    }

    const shortlisted = validApplicants.filter(a => a.status === 'Shortlisted for Interview' || a.status === 'Accepted').length
    const underReview = validApplicants.filter(a => a.status === 'Under Review').length
    const hired = validApplicants.filter(a => a.status === 'Hired').length
    const rejected = validApplicants.filter(a => a.status === 'Rejected').length
    const totalScore = validApplicants.reduce((sum, a) => sum + (a.suitabilityScore || 0), 0)
    const avgScore = Math.round(totalScore / total)

    return { total, shortlisted, underReview, hired, rejected, avgScore }
  }, [validApplicants])

  // Filtered & Sorted applicants
  const processedApplicants = useMemo(() => {
    let result = [...validApplicants]

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.userId.name.toLowerCase().includes(q) ||
        (item.userId.email && item.userId.email.toLowerCase().includes(q)) ||
        item.jobId.title.toLowerCase().includes(q) ||
        (item.jobId.location && item.jobId.location.toLowerCase().includes(q))
      )
    }

    // Recommendation level filter
    if (filterRecommendation !== 'All') {
      result = result.filter(item => item.recommendation === filterRecommendation)
    }

    // Status filter
    if (filterStatus !== 'All') {
      if (filterStatus === 'Shortlisted for Interview') {
        result = result.filter(item => item.status === 'Shortlisted for Interview' || item.status === 'Accepted')
      } else {
        result = result.filter(item => item.status === filterStatus)
      }
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'score_desc') return (b.suitabilityScore || 0) - (a.suitabilityScore || 0)
      if (sortBy === 'score_asc') return (a.suitabilityScore || 0) - (b.suitabilityScore || 0)
      if (sortBy === 'date_desc') return (b.date || 0) - (a.date || 0)
      return 0
    })

    return result
  }, [validApplicants, searchQuery, filterRecommendation, filterStatus, sortBy])

  // Helper for recommendation score badges
  const renderScoreBadge = (score = 0, recommendation = 'Pending') => {
    if (score >= 80) {
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm'>
          <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse'></span>
          {score}% • Highly Recommended
        </span>
      )
    }
    if (score >= 65) {
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 shadow-sm'>
          <span className='w-2 h-2 rounded-full bg-blue-500'></span>
          {score}% • Recommended
        </span>
      )
    }
    if (score >= 50) {
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm'>
          <span className='w-2 h-2 rounded-full bg-amber-500'></span>
          {score}% • Consider
        </span>
      )
    }
    return (
      <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300 shadow-sm'>
        <span className='w-2 h-2 rounded-full bg-gray-400'></span>
        {score}% • Low Match
      </span>
    )
  }

  // Helper for status badge rendering
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Shortlisted for Interview':
      case 'Accepted':
        return (
          <span className='inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm'>
            Shortlisted for Interview
          </span>
        )
      case 'Under Review':
        return (
          <span className='inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-sm'>
            Under Review
          </span>
        )
      case 'Hired':
        return (
          <span className='inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 shadow-sm'>
            Hired
          </span>
        )
      case 'Rejected':
        return (
          <span className='inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-sm'>
            Rejected
          </span>
        )
      case 'Pending':
      default:
        return (
          <span className='inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm'>
            Pending
          </span>
        )
    }
  }

  return applicants ? applicants.length === 0 ? (
    <div className='flex items-center justify-center h-[70vh]'>
      <div className='text-center p-8 bg-white border border-gray-100 shadow-sm rounded-2xl max-w-md'>
        <div className='w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold'>
          📋
        </div>
        <p className='text-xl sm:text-2xl font-semibold text-gray-800'>No Applications Received</p>
        <p className='text-gray-500 text-sm mt-2'>Applications submitted by candidates will appear here along with their automated suitability scores, interview scheduling tools, and candidate notification management.</p>
      </div>
    </div>
  ) : (
    <div className='container mx-auto p-4 max-w-7xl'>
      {/* Header Title & Feature Description */}
      <div className='mb-6'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2'>
              Candidate Shortlisting & Application Management
            </h1>
            <p className='text-sm text-gray-600 mt-1'>
              Review candidates, schedule interviews with automated email invitations, manage recruitment status pipelines, and track delivery logs.
            </p>
          </div>
          <button
            onClick={fetchCompanyJobApplications}
            className='px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition'
          >
            <span>🔄</span> Refresh Applications
          </button>
        </div>
      </div>

      {/* Analytics Summary KPI Cards */}
      <div className='grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 mb-6'>
        <div className='bg-white p-4 rounded-xl border border-gray-200 shadow-sm'>
          <p className='text-xs font-medium text-gray-500 uppercase tracking-wider'>Total Applicants</p>
          <p className='text-2xl font-bold text-gray-900 mt-1'>{metrics.total}</p>
          <span className='text-xs text-gray-400 mt-1 block'>All submissions</span>
        </div>

        <div className='bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm'>
          <p className='text-xs font-medium text-amber-700 uppercase tracking-wider'>Pending</p>
          <p className='text-2xl font-bold text-amber-800 mt-1'>
            {validApplicants.filter(a => a.status === 'Pending').length}
          </p>
          <span className='text-xs text-amber-600 mt-1 block'>Awaiting review</span>
        </div>

        <div className='bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm'>
          <p className='text-xs font-medium text-blue-700 uppercase tracking-wider'>Under Review</p>
          <p className='text-2xl font-bold text-blue-800 mt-1'>{metrics.underReview}</p>
          <span className='text-xs text-blue-600 mt-1 block'>Active evaluation</span>
        </div>

        <div className='bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-sm'>
          <p className='text-xs font-medium text-emerald-700 uppercase tracking-wider'>Shortlisted</p>
          <p className='text-2xl font-bold text-emerald-800 mt-1'>{metrics.shortlisted}</p>
          <span className='text-xs text-emerald-600 mt-1 block'>Interview stage</span>
        </div>

        <div className='bg-purple-50/70 p-4 rounded-xl border border-purple-200 shadow-sm'>
          <p className='text-xs font-medium text-purple-700 uppercase tracking-wider'>Hired</p>
          <p className='text-2xl font-bold text-purple-800 mt-1'>{metrics.hired}</p>
          <span className='text-xs text-purple-600 mt-1 block'>Selected candidates</span>
        </div>

        <div className='bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm'>
          <p className='text-xs font-medium text-rose-700 uppercase tracking-wider'>Rejected</p>
          <p className='text-2xl font-bold text-rose-800 mt-1'>{metrics.rejected}</p>
          <span className='text-xs text-rose-600 mt-1 block'>Archived applicants</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className='bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex-1 min-w-[240px]'>
          <div className='relative'>
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search by applicant name, email, or job title...'
              className='w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            <span className='absolute left-3 top-2.5 text-gray-400 text-sm'>🔍</span>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-3 text-sm'>
          {/* Status Filter */}
          <div className='flex items-center gap-2'>
            <label className='text-gray-600 font-medium whitespace-nowrap'>Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className='border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
            >
              <option value='All'>All Statuses</option>
              <option value='Pending'>Pending</option>
              <option value='Under Review'>Under Review</option>
              <option value='Shortlisted for Interview'>Shortlisted for Interview</option>
              <option value='Hired'>Hired</option>
              <option value='Rejected'>Rejected</option>
            </select>
          </div>

          {/* Recommendation Filter */}
          <div className='flex items-center gap-2'>
            <label className='text-gray-600 font-medium whitespace-nowrap'>Match Level:</label>
            <select
              value={filterRecommendation}
              onChange={(e) => setFilterRecommendation(e.target.value)}
              className='border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
            >
              <option value='All'>All Match Levels</option>
              <option value='Highly Recommended'>Highly Recommended (≥ 80%)</option>
              <option value='Recommended'>Recommended (65% - 79%)</option>
              <option value='Consider'>Consider (50% - 64%)</option>
              <option value='Low Match'>Low Match (&lt; 50%)</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className='flex items-center gap-2'>
            <label className='text-gray-600 font-medium whitespace-nowrap'>Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className='border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
            >
              <option value='score_desc'>Highest Suitability Score</option>
              <option value='score_asc'>Lowest Suitability Score</option>
              <option value='date_desc'>Most Recent Submission</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className='bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm text-gray-700'>
            <thead className='bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-600 tracking-wider'>
              <tr>
                <th className='py-3.5 px-4 text-center'>#</th>
                <th className='py-3.5 px-4'>Candidate Details</th>
                <th className='py-3.5 px-4 max-md:hidden'>Applied Position</th>
                <th className='py-3.5 px-4'>Resume Match Score</th>
                <th className='py-3.5 px-4 text-center'>Resume / CV</th>
                <th className='py-3.5 px-4 text-center'>Status & Email</th>
                <th className='py-3.5 px-4 text-right'>Recruitment Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200'>
              {processedApplicants.length === 0 ? (
                <tr>
                  <td colSpan={7} className='py-10 text-center text-gray-500'>
                    No applicants match the selected criteria.
                  </td>
                </tr>
              ) : (
                processedApplicants.map((applicant, index) => (
                  <tr key={applicant._id} className='hover:bg-gray-50/70 transition'>
                    <td className='py-3 px-4 text-center font-medium text-gray-500'>{index + 1}</td>

                    {/* Candidate Profile with Name & Registered Email */}
                    <td className='py-3 px-4'>
                      <div className='flex items-center gap-3'>
                        <img
                          className='w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm flex-shrink-0'
                          src={applicant.userId.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                          alt={applicant.userId.name}
                        />
                        <div className='min-w-0'>
                          <p className='font-semibold text-gray-900 truncate'>{applicant.userId.name}</p>
                          <p className='text-xs text-blue-600 truncate flex items-center gap-1 font-medium'>
                            <span>✉</span> {applicant.userId.email || 'No email registered'}
                          </p>
                          <p className='text-xs text-gray-400 md:hidden mt-0.5'>{applicant.jobId.title}</p>
                        </div>
                      </div>
                    </td>

                    {/* Job Title & Level */}
                    <td className='py-3 px-4 max-md:hidden'>
                      <p className='font-semibold text-gray-800'>{applicant.jobId.title}</p>
                      <span className='text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded'>
                        {applicant.jobId.level || 'Standard'} • {applicant.jobId.category}
                      </span>
                    </td>

                    {/* Screening Score Badge & Match Details */}
                    <td className='py-3 px-4'>
                      <div className='flex flex-col gap-1 items-start'>
                        {renderScoreBadge(applicant.suitabilityScore, applicant.recommendation)}
                        <button
                          onClick={() => setSelectedApplicant(applicant)}
                          className='text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-1 mt-0.5'
                        >
                          <span>🔍 View Match Breakdown</span>
                        </button>
                      </div>
                    </td>

                    {/* Resume Download / Preview */}
                    <td className='py-3 px-4 text-center'>
                      {applicant.userId.resume ? (
                        <a
                          href={applicant.userId.resume}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition border border-blue-200'
                        >
                          CV <img src={assets.resume_download_icon} alt='download' className='w-3.5 h-3.5' />
                        </a>
                      ) : (
                        <span className='text-xs text-gray-400 italic'>No CV</span>
                      )}
                    </td>

                    {/* Status & Notification Status */}
                    <td className='py-3 px-4 text-center'>
                      <div className='flex flex-col items-center gap-1'>
                        {renderStatusBadge(applicant.status)}

                        {/* Interview Details Sub-tag if scheduled */}
                        {(applicant.status === 'Shortlisted for Interview' || applicant.status === 'Accepted') && applicant.interviewDetails?.interviewDate && (
                          <span className='text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded mt-0.5'>
                            {applicant.interviewDetails.interviewDate} at {applicant.interviewDetails.interviewTime} ({applicant.interviewDetails.interviewFormat})
                          </span>
                        )}

                        {/* Notification Status Indicator */}
                        {applicant.notificationStatus === 'Sent' && (
                          <span className='text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5'>
                            Email Delivered
                          </span>
                        )}

                        {applicant.notificationStatus === 'Failed' && (
                          <div className='flex items-center gap-1.5 mt-0.5'>
                            <span
                              className='text-[11px] text-rose-600 font-medium cursor-help'
                              title={applicant.notificationError || 'Email delivery failed'}
                            >
                              Email Failed
                            </span>
                            <button
                              onClick={() => handleRetryNotification(applicant._id)}
                              disabled={retryingId === applicant._id}
                              className='text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-semibold transition'
                            >
                              {retryingId === applicant._id ? 'Retrying...' : 'Retry'}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Recruitment Action Buttons */}
                    <td className='py-3 px-4 text-right'>
                      <div className='inline-flex items-center gap-1.5 flex-wrap justify-end'>
                        {updatingId === applicant._id ? (
                          <span className='inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin'></span>
                        ) : (
                          <>
                            {/* Shortlist for Interview Button */}
                            {applicant.status !== 'Shortlisted for Interview' && applicant.status !== 'Hired' && (
                              <button
                                onClick={() => openInterviewModal(applicant)}
                                title='Shortlist Candidate and Schedule Interview'
                                className='px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-300 rounded-lg transition shadow-sm flex items-center gap-1'
                              >
                                Shortlist
                              </button>
                            )}

                            {/* Mark as Under Review */}
                            {applicant.status !== 'Under Review' && applicant.status !== 'Shortlisted for Interview' && applicant.status !== 'Hired' && (
                              <button
                                onClick={() => promptStatusChange(applicant, 'Under Review')}
                                title='Mark as Under Review'
                                className='px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-300 rounded-lg transition shadow-sm'
                              >
                                Review
                              </button>
                            )}

                            {/* Mark as Hired */}
                            {applicant.status !== 'Hired' && applicant.status !== 'Rejected' && (
                              <button
                                onClick={() => promptStatusChange(applicant, 'Hired')}
                                title='Confirm Job Offer / Hire Candidate'
                                className='px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white border border-purple-300 rounded-lg transition shadow-sm'
                              >
                                Hire
                              </button>
                            )}

                            {/* Reject Button */}
                            {applicant.status !== 'Rejected' && applicant.status !== 'Hired' && (
                              <button
                                onClick={() => promptStatusChange(applicant, 'Rejected')}
                                title='Reject Application'
                                className='px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-300 rounded-lg transition shadow-sm'
                              >
                                Reject
                              </button>
                            )}

                            {/* Re-screening Engine Trigger */}
                            <button
                              onClick={() => handleRescreen(applicant._id)}
                              disabled={rescreeningId === applicant._id}
                              title='Re-screen resume'
                              aria-label='Re-screen resume'
                              className='px-2.5 py-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-300 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition'
                            >
                              {rescreeningId === applicant._id ? (
                                <span className='inline-block w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin'></span>
                              ) : (
                                <span>Re-screen</span>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmModal.isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn'>
          <div className='bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold'>
                ℹ
              </div>
              <h3 className='text-lg font-bold text-gray-900'>{confirmModal.title}</h3>
            </div>

            <p className='text-sm text-gray-600 mb-6 leading-relaxed'>
              {confirmModal.message}
            </p>

            <div className='flex justify-end gap-3'>
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className='px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition'
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatus}
                className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition ${confirmModal.confirmColor}`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERVIEW SCHEDULING FORM MODAL */}
      {interviewModal.isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn'>
          <div className='bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-200 p-6'>
            <div className='flex items-start justify-between border-b pb-4 mb-4'>
              <div>
                <h3 className='text-xl font-bold text-gray-900 flex items-center gap-2'>
                  Shortlist for Interview
                </h3>
                <p className='text-xs text-gray-500 mt-1'>
                  Candidate: <strong className='text-gray-800'>{interviewModal.applicant?.userId?.name}</strong> ({interviewModal.applicant?.userId?.email})
                </p>
                <p className='text-xs text-gray-500'>
                  Position: <strong className='text-gray-800'>{interviewModal.applicant?.jobId?.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setInterviewModal(prev => ({ ...prev, isOpen: false }))}
                className='text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition font-bold'
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInterviewSubmit} className='space-y-4 text-sm'>
              {/* Date and Time Fields */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>Interview Date *</label>
                  <input
                    type='date'
                    min={new Date().toISOString().split('T')[0]}
                    value={interviewModal.interviewDate}
                    onChange={(e) => setInterviewModal(prev => ({ ...prev, interviewDate: e.target.value, errors: { ...prev.errors, interviewDate: null } }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${interviewModal.errors.interviewDate ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  />
                  {interviewModal.errors.interviewDate && (
                    <p className='text-xs text-red-600 mt-1'>{interviewModal.errors.interviewDate}</p>
                  )}
                </div>

                <div>
                  <label className='block font-semibold text-gray-700 mb-1'>Interview Time *</label>
                  <input
                    type='time'
                    value={interviewModal.interviewTime}
                    onChange={(e) => setInterviewModal(prev => ({ ...prev, interviewTime: e.target.value, errors: { ...prev.errors, interviewTime: null } }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${interviewModal.errors.interviewTime ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  />
                  {interviewModal.errors.interviewTime && (
                    <p className='text-xs text-red-600 mt-1'>{interviewModal.errors.interviewTime}</p>
                  )}
                </div>
              </div>

              {/* Interview Format (Online vs In-person) */}
              <div>
                <label className='block font-semibold text-gray-700 mb-1'>Interview Format *</label>
                <div className='grid grid-cols-2 gap-3'>
                  <button
                    type='button'
                    onClick={() => setInterviewModal(prev => ({ ...prev, interviewFormat: 'Online', errors: { ...prev.errors, interviewLocation: null } }))}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${interviewModal.interviewFormat === 'Online' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span>💻</span> Online (Video Call)
                  </button>
                  <button
                    type='button'
                    onClick={() => setInterviewModal(prev => ({ ...prev, interviewFormat: 'In-person', errors: { ...prev.errors, interviewLocation: null } }))}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${interviewModal.interviewFormat === 'In-person' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span>📍</span> In-person (Onsite)
                  </button>
                </div>
              </div>

              {/* Meeting Link or Location Address */}
              <div>
                <label className='block font-semibold text-gray-700 mb-1'>
                  {interviewModal.interviewFormat === 'Online' ? 'Online Meeting Link *' : 'Interview Location Address *'}
                </label>
                <input
                  type='text'
                  value={interviewModal.interviewLocation}
                  onChange={(e) => setInterviewModal(prev => ({ ...prev, interviewLocation: e.target.value, errors: { ...prev.errors, interviewLocation: null } }))}
                  placeholder={
                    interviewModal.interviewFormat === 'Online'
                      ? 'e.g. https://meet.google.com/xyz-abcd-efg or Zoom link'
                      : 'e.g. Headquarters Office, 5th Floor, Suite 502, 100 Innovation Way'
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${interviewModal.errors.interviewLocation ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                />
                {interviewModal.errors.interviewLocation && (
                  <p className='text-xs text-red-600 mt-1'>{interviewModal.errors.interviewLocation}</p>
                )}
              </div>

              {/* Additional Instructions or Notes */}
              <div>
                <label className='block font-semibold text-gray-700 mb-1'>Additional Instructions or Notes</label>
                <textarea
                  rows={3}
                  value={interviewModal.interviewNotes}
                  onChange={(e) => setInterviewModal(prev => ({ ...prev, interviewNotes: e.target.value }))}
                  placeholder='e.g. Please bring your portfolio, government photo ID, and prepare for a 30-minute system design discussion.'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs'
                ></textarea>
                <span className='text-[11px] text-gray-500'>Included in the automated interview invitation email.</span>
              </div>

              {/* Informational notification note */}
              <div className='p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed'>
                ✉ Submitting will save the interview schedule in MongoDB and automatically dispatch the candidate invitation email.
              </div>

              {/* Modal Actions */}
              <div className='flex justify-end gap-3 pt-3 border-t'>
                <button
                  type='button'
                  onClick={() => setInterviewModal(prev => ({ ...prev, isOpen: false }))}
                  className='px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center gap-2'
                >
                  <span>✓</span> Shortlist & Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCREENING ANALYSIS & MATCH DETAILS MODAL */}
      {selectedApplicant && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn'>
          <div className='bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 p-6'>
            {/* Modal Header */}
            <div className='flex items-start justify-between border-b pb-4'>
              <div className='flex items-center gap-3'>
                <img
                  className='w-14 h-14 rounded-full object-cover border-2 border-blue-500 shadow-md flex-shrink-0'
                  src={selectedApplicant.userId.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                  alt={selectedApplicant.userId.name}
                />
                <div>
                  <h3 className='text-xl font-bold text-gray-900'>{selectedApplicant.userId.name}</h3>
                  <p className='text-xs text-blue-600 font-semibold'>
                    ✉ {selectedApplicant.userId.email || 'No email registered'}
                  </p>
                  <p className='text-sm text-gray-600 mt-0.5'>
                    Target Position: <strong className='text-gray-900'>{selectedApplicant.jobId.title}</strong>
                  </p>
                  <p className='text-xs text-gray-400'>
                    Location: {selectedApplicant.jobId.location} • Category: {selectedApplicant.jobId.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApplicant(null)}
                className='text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition font-bold'
              >
                ✕
              </button>
            </div>

            {/* Overall Suitability Score Gauge */}
            <div className='my-6 p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 flex flex-wrap items-center justify-between gap-4'>
              <div className='flex items-center gap-4'>
                <div className='relative w-20 h-20 flex items-center justify-center rounded-full bg-white shadow-md border-4 border-blue-500'>
                  <span className='text-2xl font-black text-gray-900'>{selectedApplicant.suitabilityScore}%</span>
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs uppercase font-bold tracking-wider text-blue-700'>Screening Recommendation</span>
                  </div>
                  <h4 className='text-lg font-extrabold text-gray-900 mt-0.5'>
                    {selectedApplicant.recommendation}
                  </h4>
                  <p className='text-xs text-gray-600 mt-1 max-w-sm'>
                    {selectedApplicant.suitabilityScore >= 80
                      ? 'Exceptional compatibility with required qualifications. High-priority candidate for interview shortlisting.'
                      : selectedApplicant.suitabilityScore >= 65
                      ? 'Strong qualification match across core criteria. Recommended for candidate pipeline.'
                      : selectedApplicant.suitabilityScore >= 50
                      ? 'Moderate alignment with job requirements. Review specific portfolio or domain credentials.'
                      : 'Low alignment with core requirements for this position.'}
                  </p>
                </div>
              </div>

              {selectedApplicant.userId.resume && (
                <a
                  href={selectedApplicant.userId.resume}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-2 transition'
                >
                  Download Full CV 📄
                </a>
              )}
            </div>

            {/* Scheduled Interview Details Card if available */}
            {selectedApplicant.interviewDetails?.interviewDate && (
              <div className='mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300'>
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5'>
                    Scheduled Interview Details
                  </h4>
                  <span className='text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded'>
                    {selectedApplicant.interviewDetails.interviewFormat}
                  </span>
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700'>
                  <p><strong>Date:</strong> {selectedApplicant.interviewDetails.interviewDate}</p>
                  <p><strong>Time:</strong> {selectedApplicant.interviewDetails.interviewTime}</p>
                  <p className='sm:col-span-2'>
                    <strong>Location / Link:</strong>{' '}
                    {selectedApplicant.interviewDetails.interviewLocation?.startsWith('http') ? (
                      <a
                        href={selectedApplicant.interviewDetails.interviewLocation}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 underline font-semibold'
                      >
                        {selectedApplicant.interviewDetails.interviewLocation}
                      </a>
                    ) : (
                      selectedApplicant.interviewDetails.interviewLocation
                    )}
                  </p>
                  {selectedApplicant.interviewDetails.interviewNotes && (
                    <p className='sm:col-span-2 text-gray-600 italic'>
                      <strong>Notes:</strong> {selectedApplicant.interviewDetails.interviewNotes}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Criteria Breakdown Grid */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6'>
              {/* Skills Card */}
              <div className='p-4 bg-gray-50 rounded-xl border border-gray-200'>
                <div className='flex justify-between items-center mb-2'>
                  <span className='text-xs font-bold text-gray-700 uppercase'>Skills Match (40% Weight)</span>
                  <span className='text-xs font-bold text-blue-600'>
                    {selectedApplicant.matchDetails?.skillsScore ?? 0}%
                  </span>
                </div>
                <div className='w-full bg-gray-200 rounded-full h-2 mb-3'>
                  <div
                    className='bg-blue-600 h-2 rounded-full transition-all duration-500'
                    style={{ width: `${selectedApplicant.matchDetails?.skillsScore ?? 0}%` }}
                  ></div>
                </div>

                {/* Matched Skills Chips */}
                <div className='mt-2'>
                  <p className='text-xs font-medium text-gray-500 mb-1'>Matched Skills:</p>
                  <div className='flex flex-wrap gap-1'>
                    {selectedApplicant.matchDetails?.matchedSkills?.length > 0 ? (
                      selectedApplicant.matchDetails.matchedSkills.map((skill, idx) => (
                        <span key={idx} className='bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded'>
                          ✓ {skill}
                        </span>
                      ))
                    ) : (
                      <span className='text-xs text-gray-400 italic'>None detected</span>
                    )}
                  </div>
                </div>

                {/* Missing Skills Chips */}
                {selectedApplicant.matchDetails?.missingSkills?.length > 0 && (
                  <div className='mt-2'>
                    <p className='text-xs font-medium text-gray-500 mb-1'>Missing Required Skills:</p>
                    <div className='flex flex-wrap gap-1'>
                      {selectedApplicant.matchDetails.missingSkills.map((skill, idx) => (
                        <span key={idx} className='bg-rose-50 text-rose-700 text-[11px] font-medium px-2 py-0.5 rounded border border-rose-200'>
                          ✕ {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Work Experience Card */}
              <div className='p-4 bg-gray-50 rounded-xl border border-gray-200'>
                <div className='flex justify-between items-center mb-2'>
                  <span className='text-xs font-bold text-gray-700 uppercase'>Experience Match (25% Weight)</span>
                  <span className='text-xs font-bold text-indigo-600'>
                    {selectedApplicant.matchDetails?.experienceScore ?? 0}%
                  </span>
                </div>
                <div className='w-full bg-gray-200 rounded-full h-2 mb-3'>
                  <div
                    className='bg-indigo-600 h-2 rounded-full transition-all duration-500'
                    style={{ width: `${selectedApplicant.matchDetails?.experienceScore ?? 0}%` }}
                  ></div>
                </div>
                <p className='text-xs text-gray-700'>
                  <strong>Detected Experience:</strong> approx. {selectedApplicant.matchDetails?.detectedExperienceYears ?? 0} year(s)
                </p>
                <p className='text-xs text-gray-500 mt-1'>
                  Required Seniority Level: <strong>{selectedApplicant.jobId.level || 'Standard'}</strong>
                </p>
              </div>

              {/* Education Card */}
              <div className='p-4 bg-gray-50 rounded-xl border border-gray-200'>
                <div className='flex justify-between items-center mb-2'>
                  <span className='text-xs font-bold text-gray-700 uppercase'>Education Match (15% Weight)</span>
                  <span className='text-xs font-bold text-emerald-600'>
                    {selectedApplicant.matchDetails?.educationScore ?? 0}%
                  </span>
                </div>
                <div className='w-full bg-gray-200 rounded-full h-2 mb-3'>
                  <div
                    className='bg-emerald-600 h-2 rounded-full transition-all duration-500'
                    style={{ width: `${selectedApplicant.matchDetails?.educationScore ?? 0}%` }}
                  ></div>
                </div>
                <p className='text-xs text-gray-500 mb-1'>Detected Credentials:</p>
                <div className='flex flex-wrap gap-1'>
                  {selectedApplicant.matchDetails?.detectedEducation?.length > 0 ? (
                    selectedApplicant.matchDetails.detectedEducation.map((edu, idx) => (
                      <span key={idx} className='bg-blue-50 text-blue-700 text-[11px] font-medium px-2 py-0.5 rounded'>
                        🎓 {edu}
                      </span>
                    ))
                  ) : (
                    <span className='text-xs text-gray-400 italic'>Standard Qualifications</span>
                  )}
                </div>
              </div>

              {/* Semantic / Relevance Card */}
              <div className='p-4 bg-gray-50 rounded-xl border border-gray-200'>
                <div className='flex justify-between items-center mb-2'>
                  <span className='text-xs font-bold text-gray-700 uppercase'>Semantic Alignment (20% Weight)</span>
                  <span className='text-xs font-bold text-purple-600'>
                    {selectedApplicant.matchDetails?.relevanceScore ?? 0}%
                  </span>
                </div>
                <div className='w-full bg-gray-200 rounded-full h-2 mb-3'>
                  <div
                    className='bg-purple-600 h-2 rounded-full transition-all duration-500'
                    style={{ width: `${selectedApplicant.matchDetails?.relevanceScore ?? 0}%` }}
                  ></div>
                </div>
                <p className='text-xs text-gray-600'>
                  Vector similarity of resume context vs job description requirements and terminology.
                </p>
              </div>
            </div>

            {/* Detailed Screening Evaluation Summary */}
            <div className='p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6'>
              <h5 className='text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5'>
                <span>📝</span> Executive Screening Summary
              </h5>
              <p className='text-xs sm:text-sm text-gray-700 leading-relaxed'>
                {selectedApplicant.matchDetails?.summary || 'Standard profile evaluation completed successfully.'}
              </p>
            </div>

            {/* Modal Bottom Actions */}
            <div className='flex flex-wrap items-center justify-between gap-3 pt-4 border-t'>
              <div className='flex items-center gap-2'>
                <span className='text-xs font-medium text-gray-500'>Current Status:</span>
                {renderStatusBadge(selectedApplicant.status)}
              </div>

              <div className='flex items-center gap-2 flex-wrap'>
                <button
                  onClick={() => handleRescreen(selectedApplicant._id)}
                  disabled={rescreeningId === selectedApplicant._id}
                  className='px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition'
                >
                  {rescreeningId === selectedApplicant._id ? 'Re-analyzing...' : 'Re-screen'}
                </button>
                <button
                  onClick={() => promptStatusChange(selectedApplicant, 'Under Review')}
                  className='px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-300 rounded-lg transition'
                >
                  Under Review
                </button>
                <button
                  onClick={() => promptStatusChange(selectedApplicant, 'Rejected')}
                  className='px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-300 rounded-lg transition'
                >
                  Reject
                </button>
                <button
                  onClick={() => openInterviewModal(selectedApplicant)}
                  className='px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow transition flex items-center gap-1'
                >
                  Shortlist for Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <Loading />
  )
}

export default ViewApplications
