import { useContext, useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { assets } from '../assets/assets'
import moment from 'moment'
import Footer from '../components/Footer'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'

const Applications = () => {

  const [isEdit, setIsEdit] = useState(false)
  const [resume, setResume] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState(null)

  const { backendUrl, userToken, userData, userApplications, fetchUserData, fetchUserApplications } = useContext(AppContext)

  const updateResume = async () => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('resume', resume)

      const { data } = await axios.post(
        backendUrl + '/api/users/update-resume',
        formData,
        { headers: { Authorization: `Bearer ${userToken}` } }
      )

      if (data.success) {
        toast.success(data.message)
        await fetchUserData()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }

    setIsUploading(false)
    setIsEdit(false)
    setResume(null)
  }

  useEffect(() => {
    if (userToken) {
      fetchUserApplications()
    }
  }, [userToken])

  // Helper for rendering status badges
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Shortlisted for Interview':
      case 'Accepted':
        return (
          <span className='inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 text-xs font-bold rounded-full shadow-sm'>
            Shortlisted for Interview
          </span>
        )
      case 'Under Review':
        return (
          <span className='inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-300 px-3 py-1 text-xs font-bold rounded-full shadow-sm'>
            Under Review
          </span>
        )
      case 'Hired':
        return (
          <span className='inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-300 px-3 py-1 text-xs font-bold rounded-full shadow-sm'>
            Hired
          </span>
        )
      case 'Rejected':
        return (
          <span className='inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 text-xs font-bold rounded-full shadow-sm'>
            Rejected
          </span>
        )
      case 'Pending':
      default:
        return (
          <span className='inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 text-xs font-bold rounded-full shadow-sm'>
            Pending
          </span>
        )
    }
  }

  return userData ? (
    <>
      <Navbar />
      <div className='container px-4 min-h-[65vh] 2xl:px-20 mx-auto my-10 max-w-7xl'>
        {/* Candidate Resume Section */}
        <div className='bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8'>
          <h2 className='text-xl font-bold text-gray-900'>Your Resume</h2>
          <p className='text-xs text-gray-500 mt-1'>Keep your CV up to date for automated qualification screening and recruiter review.</p>
          
          <div className='flex flex-wrap items-center gap-3 mt-4'>
            {isEdit || (userData && userData.resume === "") ? (
              <>
                <label className='flex items-center cursor-pointer' htmlFor="resumeUpload">
                  <span className='bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition'>
                    {resume ? resume.name : "Select PDF Resume"}
                  </span>
                  <input id='resumeUpload' onChange={e => setResume(e.target.files[0])} accept='application/pdf' type="file" hidden />
                  <img src={assets.profile_upload_icon} alt="" className='ml-2' />
                </label>
                <button
                  onClick={updateResume}
                  disabled={isUploading || !resume}
                  className='bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50 transition shadow-sm flex items-center gap-2'
                >
                  {isUploading && <span className='w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin'></span>}
                  {isUploading ? 'Saving...' : 'Save Resume'}
                </button>
                {userData.resume && (
                  <button
                    onClick={() => { setIsEdit(false); setResume(null); }}
                    className='text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-2'
                  >
                    Cancel
                  </button>
                )}
              </>
            ) : (
              <div className='flex items-center gap-3'>
                <a
                  target='_blank'
                  rel='noopener noreferrer'
                  href={userData.resume}
                  className='bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition'
                >
                  <span>📄</span> View Current Resume
                </a>
                <button
                  onClick={() => setIsEdit(true)}
                  className='text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition'
                >
                  Replace CV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Applied Jobs Section */}
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h2 className='text-xl font-bold text-gray-900'>Jobs Applied</h2>
            <p className='text-xs text-gray-500 mt-0.5'>Track application statuses and upcoming interview schedules in real-time.</p>
          </div>
          <button
            onClick={fetchUserApplications}
            className='text-xs bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg shadow-sm font-medium transition flex items-center gap-1.5'
          >
            <span>🔄</span> Refresh Status
          </button>
        </div>

        <div className='bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm text-gray-700'>
              <thead className='bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-600 tracking-wider'>
                <tr>
                  <th className='py-3.5 px-4'>Company</th>
                  <th className='py-3.5 px-4'>Job Title</th>
                  <th className='py-3.5 px-4 max-sm:hidden'>Location</th>
                  <th className='py-3.5 px-4 max-sm:hidden'>Applied Date</th>
                  <th className='py-3.5 px-4'>Match Score</th>
                  <th className='py-3.5 px-4 text-center'>Status</th>
                  <th className='py-3.5 px-4 text-right'>Interview Details</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200'>
                {userApplications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='py-12 text-center text-gray-500'>
                      You have not applied for any jobs yet. Explore open positions to get started!
                    </td>
                  </tr>
                ) : (
                  userApplications.map((job, index) => {
                    const isShortlisted = job.status === 'Shortlisted for Interview' || job.status === 'Accepted'
                    const hasInterviewDetails = Boolean(job.interviewDetails?.interviewDate)

                    return (
                      <tr key={job._id || index} className='hover:bg-gray-50/70 transition'>
                        {/* Company Logo & Name */}
                        <td className='py-3.5 px-4'>
                          <div className='flex items-center gap-3'>
                            <img
                              className='w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0'
                              src={job.companyId?.image || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=80&q=80'}
                              alt={job.companyId?.name}
                            />
                            <div>
                              <p className='font-semibold text-gray-900'>{job.companyId?.name}</p>
                              <p className='text-xs text-gray-400 sm:hidden'>{job.jobId?.location}</p>
                            </div>
                          </div>
                        </td>

                        {/* Job Title */}
                        <td className='py-3.5 px-4'>
                          <p className='font-semibold text-gray-800'>{job.jobId?.title}</p>
                          <span className='text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded'>
                            {job.jobId?.category || 'General'}
                          </span>
                        </td>

                        {/* Location */}
                        <td className='py-3.5 px-4 max-sm:hidden text-gray-600 font-medium'>
                          {job.jobId?.location}
                        </td>

                        {/* Date Applied */}
                        <td className='py-3.5 px-4 max-sm:hidden text-gray-500'>
                          {moment(job.date).format('ll')}
                        </td>

                        {/* Match Score */}
                        <td className='py-3.5 px-4'>
                          {job.suitabilityScore ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              job.suitabilityScore >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : job.suitabilityScore >= 65
                                ? 'bg-blue-100 text-blue-800'
                                : job.suitabilityScore >= 50
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {job.suitabilityScore}% {job.recommendation && `• ${job.recommendation}`}
                            </span>
                          ) : (
                            <span className='text-xs text-gray-400 italic'>Screening pending</span>
                          )}
                        </td>

                        {/* Current Status */}
                        <td className='py-3.5 px-4 text-center'>
                          {renderStatusBadge(job.status)}
                        </td>

                        {/* Interview Details Action / Button */}
                        <td className='py-3.5 px-4 text-right'>
                          {isShortlisted && hasInterviewDetails ? (
                            <button
                              onClick={() => setSelectedInterview(job)}
                              className='px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition inline-flex items-center gap-1.5'
                            >
                              <span>📅</span> View Interview
                            </button>
                          ) : isShortlisted ? (
                            <span className='text-xs text-emerald-600 font-semibold'>Invitation Pending</span>
                          ) : (
                            <span className='text-xs text-gray-400'>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CANDIDATE INTERVIEW DETAILS MODAL */}
        {selectedInterview && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn'>
            <div className='bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 p-6'>
              <div className='flex items-start justify-between border-b pb-4 mb-4'>
                <div className='flex items-center gap-3'>
                  <img
                    className='w-12 h-12 rounded-full object-cover border'
                    src={selectedInterview.companyId?.image || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=80&q=80'}
                    alt={selectedInterview.companyId?.name}
                  />
                  <div>
                    <h3 className='text-lg font-bold text-gray-900'>Interview Invitation</h3>
                    <p className='text-xs text-gray-600'>
                      <strong>{selectedInterview.jobId?.title}</strong> at <strong>{selectedInterview.companyId?.name}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInterview(null)}
                  className='text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition font-bold'
                >
                  ✕
                </button>
              </div>

              <div className='space-y-4 text-sm text-gray-700'>
                <div className='p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold'>
                  <span>🎉</span> Congratulations! You have progressed to the interview stage.
                </div>

                <div className='grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200'>
                  <div>
                    <p className='text-xs text-gray-500 font-semibold uppercase'>Interview Date</p>
                    <p className='text-base font-bold text-gray-900 mt-0.5'>
                      {selectedInterview.interviewDetails?.interviewDate || 'TBD'}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 font-semibold uppercase'>Interview Time</p>
                    <p className='text-base font-bold text-gray-900 mt-0.5'>
                      {selectedInterview.interviewDetails?.interviewTime || 'TBD'}
                    </p>
                  </div>
                  <div className='col-span-2 pt-2 border-t border-gray-200'>
                    <p className='text-xs text-gray-500 font-semibold uppercase'>Format</p>
                    <p className='text-sm font-semibold text-gray-800 mt-0.5'>
                      {selectedInterview.interviewDetails?.interviewFormat === 'Online' ? '💻 Online Video Interview' : '📍 In-person Onsite Interview'}
                    </p>
                  </div>
                </div>

                {/* Location or Meeting Link */}
                <div className='bg-gray-50 p-4 rounded-xl border border-gray-200'>
                  <p className='text-xs text-gray-500 font-semibold uppercase mb-1'>
                    {selectedInterview.interviewDetails?.interviewFormat === 'Online' ? 'Meeting Link' : 'Location Address'}
                  </p>
                  {selectedInterview.interviewDetails?.interviewLocation?.startsWith('http') ? (
                    <a
                      href={selectedInterview.interviewDetails?.interviewLocation}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition shadow-sm'
                    >
                      <span>🔗</span> Join Interview Meeting
                    </a>
                  ) : (
                    <p className='font-semibold text-gray-900'>
                      {selectedInterview.interviewDetails?.interviewLocation || 'Will be shared by the recruiter'}
                    </p>
                  )}
                </div>

                {/* Additional Instructions / Notes */}
                {selectedInterview.interviewDetails?.interviewNotes && (
                  <div className='bg-blue-50/70 p-4 rounded-xl border border-blue-200 text-xs text-blue-900'>
                    <p className='font-bold uppercase tracking-wider mb-1'>Recruiter Instructions:</p>
                    <p className='leading-relaxed'>{selectedInterview.interviewDetails?.interviewNotes}</p>
                  </div>
                )}
              </div>

              <div className='mt-6 pt-4 border-t flex justify-end'>
                <button
                  onClick={() => setSelectedInterview(null)}
                  className='px-5 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded-lg transition'
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  ) : <Loading />
}

export default Applications