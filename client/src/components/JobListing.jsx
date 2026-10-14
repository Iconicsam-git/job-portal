import { useContext, useState, useMemo, useCallback } from 'react'
import { AppContext } from '../context/AppContext'
import { assets, JobCategories, JobLocations } from '../assets/assets'
import JobCard from './JobCard'
import CitySelect from './CitySelect'
import { normalizeLocation, isLocationMatch, getCanonicalLocations } from '../utils/locationHelper'

const JobListing = () => {

    const { isSearched, searchFilter, setSearchFilter, jobs, jobsLoading } = useContext(AppContext)

    const [showFilter, setShowFilter] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedCategories, setSelectedCategories] = useState([])
    const [selectedLocations, setSelectedLocations] = useState([])
    const [cityInput, setCityInput] = useState('')

    // Consolidate all raw location variations (e.g., "Abuja", "Abuja FCT", "Abuja, Nigeria")
    // into deduplicated canonical locations with live job counts
    const canonicalLocations = useMemo(() => {
        return getCanonicalLocations(jobs, JobLocations)
    }, [jobs])

    // Fast in-memory category filter toggle
    const handleCategoryChange = useCallback((category) => {
        setCurrentPage(1)
        setSelectedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        )
    }, [])

    // Fast in-memory location filter toggle using canonical name
    const handleLocationChange = useCallback((canonicalLoc) => {
        setCurrentPage(1)
        setSelectedLocations(prev =>
            prev.includes(canonicalLoc) ? prev.filter(c => c !== canonicalLoc) : [...prev, canonicalLoc]
        )
    }, [])

    // Handle city selection from CitySelect search
    const handleAddCityFromSearch = useCallback((city) => {
        setCityInput(city)
        if (city) {
            const canonical = normalizeLocation(city)
            if (canonical) {
                setCurrentPage(1)
                setSelectedLocations(prev =>
                    prev.includes(canonical) ? prev : [...prev, canonical]
                )
            }
        }
    }, [])

    // Compute filtered jobs via useMemo to eliminate double-render cascades
    const filteredJobs = useMemo(() => {
        if (!jobs || jobs.length === 0) return []

        const matchesCategory = job =>
            selectedCategories.length === 0 || selectedCategories.includes(job.category)

        const matchesLocation = job => {
            if (selectedLocations.length === 0) return true
            return selectedLocations.some(selectedLoc => isLocationMatch(job.location, selectedLoc))
        }

        const matchesTitle = job =>
            !searchFilter.title ||
            job.title.toLowerCase().includes(searchFilter.title.toLowerCase())

        const matchesSearchLocation = job =>
            !searchFilter.location ||
            isLocationMatch(job.location, searchFilter.location)

        return jobs.slice().reverse().filter(
            job => matchesCategory(job) && matchesLocation(job) && matchesTitle(job) && matchesSearchLocation(job)
        )
    }, [jobs, selectedCategories, selectedLocations, searchFilter])

    const totalPages = Math.ceil(filteredJobs.length / 6)

    // Current page slice computed without triggering state updates
    const currentJobs = useMemo(() => {
        const start = (currentPage - 1) * 6
        return filteredJobs.slice(start, start + 6)
    }, [filteredJobs, currentPage])

    const scrollToJobList = () => {
        const element = document.getElementById('job-list')
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
        }
    }

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage)
        scrollToJobList()
    }

    return (
        <div className='container 2xl:px-20 mx-auto flex flex-col lg:flex-row max-lg:space-y-8 py-8'>

            {/* Sidebar */}
            <div className='w-full lg:w-1/4 bg-white px-4'>

                {/* Search Filter from Hero Component */}
                {
                    isSearched && (searchFilter.title !== "" || searchFilter.location !== "") && (
                        <>
                            <h3 className='font-medium text-lg mb-4'>Current Search</h3>
                            <div className='mb-4 text-gray-600 flex flex-wrap gap-2'>
                                {searchFilter.title && (
                                    <span className='inline-flex items-center gap-2.5 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded text-sm'>
                                        {searchFilter.title}
                                        <img
                                            onClick={() => setSearchFilter(prev => ({ ...prev, title: "" }))}
                                            className='cursor-pointer w-3.5 h-3.5'
                                            src={assets.cross_icon}
                                            alt="clear title"
                                        />
                                    </span>
                                )}
                                {searchFilter.location && (
                                    <span className='inline-flex items-center gap-2.5 bg-red-50 border border-red-200 px-3.5 py-1.5 rounded text-sm'>
                                        {normalizeLocation(searchFilter.location) || searchFilter.location}
                                        <img
                                            onClick={() => setSearchFilter(prev => ({ ...prev, location: "" }))}
                                            className='cursor-pointer w-3.5 h-3.5'
                                            src={assets.cross_icon}
                                            alt="clear location"
                                        />
                                    </span>
                                )}
                            </div>
                        </>
                    )
                }

                <button
                    onClick={() => setShowFilter(prev => !prev)}
                    className='px-6 py-1.5 rounded border border-gray-400 lg:hidden'
                >
                    {showFilter ? "Close" : "Filters"}
                </button>

                {/* Category Filter */}
                <div className={showFilter ? "" : "max-lg:hidden"}>
                    <h4 className='font-medium text-lg py-4'>Search by Categories</h4>
                    <ul className='space-y-4 text-gray-600'>
                        {
                            JobCategories.map((category, index) => (
                                <li className='flex gap-3 items-center' key={index}>
                                    <label className='flex gap-3 items-center cursor-pointer select-none'>
                                        <input
                                            className='h-4 w-4 shrink-0 accent-blue-600'
                                            type="checkbox"
                                            onChange={() => handleCategoryChange(category)}
                                            checked={selectedCategories.includes(category)}
                                        />
                                        <span>{category}</span>
                                    </label>
                                </li>
                            ))
                        }
                    </ul>
                </div>

                {/* Location Filter */}
                <div className={showFilter ? "" : "max-lg:hidden"}>
                    <h4 className='font-medium text-lg py-4 pt-14'>Search by Location</h4>
                    
                    <div className='mb-4'>
                        <CitySelect
                            value={cityInput}
                            onChange={handleAddCityFromSearch}
                            placeholder='Search any city in the world...'
                            inputClassName='text-sm'
                        />
                    </div>

                    {/* Selected custom location tags */}
                    {selectedLocations.filter(loc => !canonicalLocations.some(cl => cl.name.toLowerCase() === loc.toLowerCase())).length > 0 && (
                        <div className='mb-4 flex flex-wrap gap-2'>
                            {selectedLocations.filter(loc => !canonicalLocations.some(cl => cl.name.toLowerCase() === loc.toLowerCase())).map((loc, idx) => (
                                <span key={idx} className='inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded border border-gray-300'>
                                    {loc}
                                    <img
                                        onClick={() => handleLocationChange(loc)}
                                        className='cursor-pointer w-3 h-3'
                                        src={assets.cross_icon}
                                        alt="remove"
                                    />
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Canonical, Unified Locations List */}
                    <ul className='space-y-3 text-gray-600 max-h-60 overflow-y-auto p-1'>
                        {
                            canonicalLocations.map((item, index) => (
                                <li className='flex items-center justify-between text-sm' key={index}>
                                    <label className='flex gap-3 items-center cursor-pointer select-none flex-1'>
                                        <input
                                            className='h-4 w-4 shrink-0 accent-blue-600'
                                            type="checkbox"
                                            onChange={() => handleLocationChange(item.name)}
                                            checked={selectedLocations.includes(item.name)}
                                        />
                                        <span>{item.name}</span>
                                    </label>
                                    {item.count > 0 && (
                                        <span className='text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium'>
                                            {item.count}
                                        </span>
                                    )}
                                </li>
                            ))
                        }
                    </ul>
                </div>
            </div>

            {/* Job listings */}
            <section className='w-full lg:w-3/4 text-gray-800 max-lg:px-4'>
                <h3 className='font-medium text-3xl py-2' id='job-list'>Latest jobs</h3>
                <p className='mb-8'>Get your desired job from top companies</p>
                {jobsLoading ? (
                    <div className='flex justify-center py-20'>
                        <div className='w-12 h-12 border-4 border-gray-300 border-t-4 border-t-blue-400 rounded-full animate-spin'></div>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <p className='text-center text-gray-500 py-20'>No jobs found matching your filters.</p>
                ) : (
                    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
                        {currentJobs.map((job) => (
                            <JobCard key={job._id || job.title} job={job} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {filteredJobs.length > 0 && totalPages > 1 && (
                    <div className='flex items-center justify-center space-x-2 mt-10'>
                        <button
                            onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                            disabled={currentPage === 1}
                            className='p-2 border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50'
                        >
                            <img src={assets.left_arrow_icon} alt="previous" className='w-4 h-4' />
                        </button>
                        {Array.from({ length: totalPages }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => handlePageChange(index + 1)}
                                className={`w-10 h-10 flex items-center justify-center border border-gray-300 rounded font-medium transition ${
                                    currentPage === index + 1 ? 'bg-blue-100 text-blue-600 border-blue-400' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {index + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className='p-2 border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50'
                        >
                            <img src={assets.right_arrow_icon} alt="next" className='w-4 h-4' />
                        </button>
                    </div>
                )}

            </section>

        </div>
    )
}

export default JobListing
