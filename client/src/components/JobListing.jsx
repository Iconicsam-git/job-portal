import { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { assets, JobCategories, JobLocations } from '../assets/assets'
import JobCard from './JobCard'
import CitySelect from './CitySelect'

const JobListing = () => {

    const { isSearched, searchFilter, setSearchFilter, jobs, jobsLoading } = useContext(AppContext)

    const [showFilter, setShowFilter] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedCategories, setSelectedCategories] = useState([])
    const [selectedLocations, setSelectedLocations] = useState([])
    const [cityInput, setCityInput] = useState('')

    const [filteredJobs, setFilteredJobs] = useState(jobs)

    // Dynamic list of locations from active jobs combined with defaults
    const availableLocations = Array.from(
        new Set([
            ...JobLocations,
            ...jobs.map(j => j.location).filter(Boolean)
        ])
    )

    const handleCategoryChange = (category) => {
        setSelectedCategories(
            prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        )
    }

    const handleLocationChange = (location) => {
        setSelectedLocations(
            prev => prev.includes(location) ? prev.filter(c => c !== location) : [...prev, location]
        )
    }

    const handleAddCityFromSearch = (city) => {
        setCityInput(city)
        if (city && !selectedLocations.includes(city)) {
            setSelectedLocations(prev => [...prev, city])
        }
    }

    useEffect(() => {

        const matchesCategory = job => selectedCategories.length === 0 || selectedCategories.includes(job.category)

        const matchesLocation = job => {
            if (selectedLocations.length === 0) return true
            return selectedLocations.some(loc => 
                job.location.toLowerCase().includes(loc.toLowerCase()) ||
                loc.toLowerCase().includes(job.location.toLowerCase())
            )
        }

        const matchesTitle = job => searchFilter.title === "" || job.title.toLowerCase().includes(searchFilter.title.toLowerCase())

        const matchesSearchLocation = job => searchFilter.location === "" || job.location.toLowerCase().includes(searchFilter.location.toLowerCase())

        const newFilteredJobs = jobs.slice().reverse().filter(
            job => matchesCategory(job) && matchesLocation(job) && matchesTitle(job) && matchesSearchLocation(job)
        )

        setFilteredJobs(newFilteredJobs)
        setCurrentPage(1)
    }, [jobs, selectedCategories, selectedLocations, searchFilter])

    return (
        <div className='container 2xl:px-20 mx-auto flex flex-col lg:flex-row max-lg:space-y-8 py-8'>

            {/* Sidebar */}
            <div className='w-full lg:w-1/4 bg-white px-4'>

                {/*  Search Filter from Hero Component */}
                {
                    isSearched && (searchFilter.title !== "" || searchFilter.location !== "") && (
                        <>
                            <h3 className='font-medium text-lg mb-4'>Current Search</h3>
                            <div className='mb-4 text-gray-600'>
                                {searchFilter.title && (
                                    <span className='inline-flex items-center gap-2.5 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded'>
                                        {searchFilter.title}
                                        <img onClick={e => setSearchFilter(prev => ({ ...prev, title: "" }))} className='cursor-pointer' src={assets.cross_icon} alt="" />
                                    </span>
                                )}
                                {searchFilter.location && (
                                    <span className='ml-2 inline-flex items-center gap-2.5 bg-red-50 border border-red-200 px-4 py-1.5 rounded'>
                                        {searchFilter.location}
                                        <img onClick={e => setSearchFilter(prev => ({ ...prev, location: "" }))} className='cursor-pointer' src={assets.cross_icon} alt="" />
                                    </span>
                                )}
                            </div>
                        </>
                    )
                }

                <button onClick={e => setShowFilter(prev => !prev)} className='px-6 py-1.5 rounded border border-gray-400 lg:hidden'>
                    {showFilter ? "Close" : "Filters"}
                </button>

                {/* Category Filter */}
                <div className={showFilter ? "" : "max-lg:hidden"}>
                    <h4 className='font-medium text-lg py-4'>Search by Categories</h4>
                    <ul className='space-y-4 text-gray-600'>
                        {
                            JobCategories.map((category, index) => (
                                <li className='flex gap-3 items-center' key={index}>
                                    <input
                                        className='scale-125'
                                        type="checkbox"
                                        onChange={() => handleCategoryChange(category)}
                                        checked={selectedCategories.includes(category)}
                                    />
                                    {category}
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
                    {selectedLocations.filter(loc => !availableLocations.includes(loc)).length > 0 && (
                        <div className='mb-4 flex flex-wrap gap-2'>
                            {selectedLocations.filter(loc => !availableLocations.includes(loc)).map((loc, idx) => (
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

                    <ul className='space-y-4 text-gray-600 max-h-60 overflow-y-auto pr-1'>
                        {
                            availableLocations.map((location, index) => (
                                <li className='flex gap-3 items-center' key={index}>
                                    <input
                                        className='scale-125'
                                        type="checkbox"
                                        onChange={() => handleLocationChange(location)}
                                        checked={selectedLocations.includes(location)}
                                    />
                                    {location}
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
                        {filteredJobs.slice((currentPage - 1) * 6, currentPage * 6).map((job, index) => (
                            <JobCard key={index} job={job} />
                        ))}
                    </div>
                )}


                {/* Pagination */}
                {filteredJobs.length > 0 && (
                    <div className='flex items-center justify-center space-x-2 mt-10'>
                        <a href="#job-list">
                            <img onClick={() => setCurrentPage(Math.max(currentPage - 1), 1)} src={assets.left_arrow_icon} alt="" />
                        </a>
                        {Array.from({ length: Math.ceil(filteredJobs.length / 6) }).map((_, index) => (
                            <a key={index} href="#job-list">
                                <button onClick={() => setCurrentPage(index + 1)} className={`w-10 h-10 flex items-center justify-center border border-gray-300 rounded ${currentPage === index + 1 ? 'bg-blue-100 text-blue-500' : 'text-gray-500'}`}>{index + 1}</button>
                            </a>
                        ))}
                        <a href="#job-list">
                            <img onClick={() => setCurrentPage(Math.min(currentPage + 1, Math.ceil(filteredJobs.length / 6)))} src={assets.right_arrow_icon} alt="" />
                        </a>
                    </div>
                )}

            </section>

        </div>
    )
}

export default JobListing