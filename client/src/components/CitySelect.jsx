import { useState, useEffect, useRef } from 'react'

const POPULAR_CITIES = [
    'Bangalore, India',
    'New York, United States',
    'London, United Kingdom',
    'Tokyo, Japan',
    'Paris, France',
    'Sydney, Australia',
    'Dubai, United Arab Emirates',
    'Singapore',
    'San Francisco, United States',
    'Toronto, Canada',
    'Berlin, Germany',
    'Mumbai, India'
]

const CitySelect = ({
    value = '',
    onChange = () => {},
    placeholder = 'Search city...',
    className = '',
    inputClassName = ''
}) => {
    const [inputValue, setInputValue] = useState(value)
    const [suggestions, setSuggestions] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null)

    // Sync input value with prop if prop changes externally
    useEffect(() => {
        setInputValue(value)
    }, [value])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Debounced city search via Open-Meteo Geocoding API
    useEffect(() => {
        const query = inputValue.trim()
        if (query.length < 2) {
            setSuggestions([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        const timer = setTimeout(async () => {
            try {
                const response = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
                )
                const data = await response.json()
                if (data && data.results) {
                    const formatted = data.results.map((item) => {
                        const parts = [item.name]
                        if (item.admin1 && item.admin1 !== item.name) {
                            parts.push(item.admin1)
                        }
                        if (item.country) {
                            parts.push(item.country)
                        }
                        return parts.join(', ')
                    })
                    // Filter duplicates
                    setSuggestions(Array.from(new Set(formatted)))
                } else {
                    setSuggestions([])
                }
            } catch (err) {
                console.error('Error fetching cities:', err)
                setSuggestions([])
            } finally {
                setIsLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [inputValue])

    const handleInputChange = (e) => {
        const newValue = e.target.value
        setInputValue(newValue)
        onChange(newValue)
        setIsOpen(true)
    }

    const handleSelectCity = (city) => {
        setInputValue(city)
        onChange(city)
        setIsOpen(false)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsOpen(false)
        }
    }

    const displaySuggestions = inputValue.trim().length < 2 ? POPULAR_CITIES : suggestions

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={`w-full px-3 py-2 border-2 border-gray-300 rounded outline-none focus:border-blue-500 transition-colors ${inputClassName}`}
                />
                {isLoading && (
                    <div className="absolute right-3 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {inputValue.trim().length < 2 && (
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50 border-b border-gray-100">
                            Popular Cities
                        </div>
                    )}
                    {displaySuggestions.length > 0 ? (
                        displaySuggestions.map((city, index) => (
                            <div
                                key={index}
                                onClick={() => handleSelectCity(city)}
                                className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                            >
                                {city}
                            </div>
                        ))
                    ) : (
                        !isLoading && (
                            <div className="px-3 py-2 text-sm text-gray-500 italic">
                                No matching cities found. You can still use &quot;{inputValue}&quot;.
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    )
}

export default CitySelect
