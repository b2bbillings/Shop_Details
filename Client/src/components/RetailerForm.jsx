import React, { useState, useEffect, useCallback } from 'react';
import { utils, write } from 'xlsx';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

// PDF styling
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  shopSection: {
    marginBottom: 20,
    padding: 10,
    border: '1px solid #ccc',
    borderRadius: 8,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 12,
    marginBottom: 3,
  },
});
// Mock API functions (replace with your actual API calls)
const API_BASE = process.env.NODE_ENV === 'production' 
  ? '/api'  // Use relative URL in production
  : 'http://localhost:5000/api';  // Use localhost in development

const createShop = (shopData) => 
  fetch(`${API_BASE}/shops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shopData)
  }).then(res => {
    if (!res.ok) throw new Error('Failed to create shop');
    return res.json();
  });

const getShops = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.state) params.append('state', filters.state);
  if (filters.district) params.append('district', filters.district);
  if (filters.taluka) params.append('taluka', filters.taluka);
  if (filters.village) params.append('village', filters.village);
  
  return fetch(`${API_BASE}/shops?${params}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch shops');
      return res.json();
    });
};

const updateShop = (id, shopData) =>
  fetch(`${API_BASE}/shops/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shopData)
  }).then(res => {
    if (!res.ok) throw new Error('Failed to update shop');
    return res.json();
  });

const deleteShop = (id) =>
  fetch(`${API_BASE}/shops/${id}`, {
    method: 'DELETE'
  }).then(res => {
    if (!res.ok) throw new Error('Failed to delete shop');
    return res.json();
  });

const getUniqueStates = () => fetch(`${API_BASE}/states`).then(res => res.json()).catch(() => []);
const getUniqueDistricts = () => fetch(`${API_BASE}/districts`).then(res => res.json()).catch(() => []);
const getUniqueTalukas = () => fetch(`${API_BASE}/talukas`).then(res => res.json()).catch(() => []);
const getUniqueVillages = () => fetch(`${API_BASE}/villages`).then(res => res.json()).catch(() => []);

// Toast component
const Toast = ({ message, type, show, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' : 
      type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
    } animate-bounce`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
          ×
        </button>
      </div>
    </div>
  );
};

// Modal Component
const Modal = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-[1000]">
      <div className="bg-white rounded-xl p-6 w-full max-w-5xl max-h-[80vh] overflow-y-auto relative">
        <button
          className="absolute top-4 right-4 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-gray-200"
          onClick={onClose}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
};

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const RetailerForm = () => {
  const [formData, setFormData] = useState({
    businessCategory: '',
    shopName: '',
    shopPhone: '',
    email: '',
    website: '',
    address: {
      street: '',
      pincode: '',
      village: '',
      taluka: '',
      district: '',
      state: '',
      country: 'India',
    },
  });

  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDataModal, setShowDataModal] = useState(false);
  const [retailers, setRetailers] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  // Filter states - separate from debounced values
  const [filterCategory, setFilterCategory] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterTaluka, setFilterTaluka] = useState('');
  const [filterVillage, setFilterVillage] = useState('');
  
  // Debounced filter values
  const debouncedCategory = useDebounce(filterCategory, 500);
  const debouncedState = useDebounce(filterState, 500);
  const debouncedDistrict = useDebounce(filterDistrict, 500);
  const debouncedTaluka = useDebounce(filterTaluka, 500);
  const debouncedVillage = useDebounce(filterVillage, 500);
  
  const [editMode, setEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [uniqueStates, setUniqueStates] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueTalukas, setUniqueTalukas] = useState([]);
  const [uniqueVillages, setUniqueVillages] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const businessCategories = [
    'Computer and IT', 'Electronics', 'Electrical', 'Automobiles'
  ];

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  useEffect(() => {
    const fetchUniqueLocations = async () => {
      try {
        const [statesRes, districtsRes, talukasRes, villagesRes] = await Promise.all([
          getUniqueStates(),
          getUniqueDistricts(),
          getUniqueTalukas(),
          getUniqueVillages()
        ]);
        setUniqueStates(statesRes);
        setUniqueDistricts(districtsRes);
        setUniqueTalukas(talukasRes);
        setUniqueVillages(villagesRes);
      } catch (err) {
        console.error('Failed to fetch unique locations:', err);
      }
    };
    fetchUniqueLocations();
  }, []);

  const fetchShops = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const data = await getShops(filters);
      setRetailers(data);
      // Apply local filtering in addition to backend filtering
      const locallyFiltered = applyLocalFilters(data, {
        category: debouncedCategory,
        state: debouncedState,
        district: debouncedDistrict,
        taluka: debouncedTaluka,
        village: debouncedVillage
      });
      setFilteredData(locallyFiltered);
    } catch (err) {
      console.error('Fetch shops error:', err);
      showToast('Failed to fetch retailer data', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedCategory, debouncedState, debouncedDistrict, debouncedTaluka, debouncedVillage]);

  // Local filtering function for client-side filtering
  const applyLocalFilters = (data, filters) => {
    if (!data) return [];
    
    return data.filter(shop => {
      // Category filter
      if (filters.category && shop.businessCategory.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
      
      // State filter - case insensitive partial match
      if (filters.state && !shop.address.state.toLowerCase().includes(filters.state.toLowerCase())) {
        return false;
      }
      
      // District filter - case insensitive partial match
      if (filters.district && !shop.address.district.toLowerCase().includes(filters.district.toLowerCase())) {
        return false;
      }
      
      // Taluka filter - case insensitive partial match
      if (filters.taluka && !shop.address.taluka.toLowerCase().includes(filters.taluka.toLowerCase())) {
        return false;
      }
      
      // Village filter - case insensitive partial match
      if (filters.village && !shop.address.village.toLowerCase().includes(filters.village.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  };

  // Apply local filtering when debounced values change
  useEffect(() => {
    if (retailers.length > 0) {
      const filtered = applyLocalFilters(retailers, {
        category: debouncedCategory,
        state: debouncedState,
        district: debouncedDistrict,
        taluka: debouncedTaluka,
        village: debouncedVillage
      });
      setFilteredData(filtered);
    }
  }, [retailers, debouncedCategory, debouncedState, debouncedDistrict, debouncedTaluka, debouncedVillage]);

  // Fetch shops when modal opens
  useEffect(() => {
    if (showDataModal) {
      fetchShops();
    }
  }, [showDataModal, fetchShops]);

  const handleShowDetails = async () => {
    await fetchShops();
    setShowDataModal(true);
    setEditMode(false);
  };

  const handleEdit = (shop) => {
    setEditMode(true);
    setEditIndex(shop);
    setFormData(shop);
    setCurrentStep(1);
    setShowDataModal(false);
  };

  const handleDelete = async (id) => {
    if (!id) {
      console.error('Delete error: No ID provided');
      showToast('Cannot delete: Invalid retailer ID', 'error');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this retailer?')) {
      return;
    }

    // Add to deleting set
    setDeletingIds(prev => new Set([...prev, id]));
    
    try {
      // console.log('Attempting to delete shop with ID:', id);
      const response = await deleteShop(id);
      // console.log('Delete response:', response);
      showToast('Retailer deleted successfully!', 'success');
      
      // Refresh the entire list to ensure consistency
      await fetchShops();
    } catch (err) {
      console.error('Delete error:', err);
      const errorMessage = err.message || 'Failed to delete retailer';
      showToast(errorMessage, 'error');
    } finally {
      // Remove from deleting set
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const exportToExcel = (data) => {
    const ws = utils.json_to_sheet(data.map(shop => ({
      'Business Category': shop.businessCategory,
      'Shop Name': shop.shopName,
      'Phone Number': shop.shopPhone,
      'Email': shop.email,
      'Website': shop.website,
      'Address': shop.address.street,
      'PIN Code': shop.address.pincode,
      'Village/Colony': shop.address.village,
      'Taluka': shop.address.taluka,
      'District': shop.address.district,
      'State': shop.address.state,
      'Country': shop.address.country,
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Shops");
    const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, 'shops.xlsx');
  };

  const exportToPDF = async (data) => {
    const MyDocument = () => (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>Retailer Data</Text>
          {data.length > 0 ? (
            data.map((shop, index) => (
              <View key={index} style={styles.shopSection}>
                <Text style={styles.shopName}>{shop.shopName}</Text>
                <Text style={styles.detailText}>Category: {shop.businessCategory}</Text>
                <Text style={styles.detailText}>Phone: {shop.shopPhone}</Text>
                <Text style={styles.detailText}>Email: {shop.email}</Text>
                <Text style={styles.detailText}>Website: {shop.website || 'N/A'}</Text>
                <Text style={styles.detailText}>Address: {`${shop.address.street}, ${shop.address.village}, ${shop.address.taluka}, ${shop.address.district}, ${shop.address.state}, ${shop.address.pincode}, ${shop.address.country}`}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.detailText}>No data available.</Text>
          )}
        </Page>
      </Document>
    );

    const blob = await pdf(<MyDocument />).toBlob();
    saveAs(blob, 'shops.pdf');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    if (errors[name] || errors[child]) {
      setErrors((prev) => ({ ...prev, [name]: '', [child]: '' }));
    }
  };

  // Pincode auto-fill functionality
  useEffect(() => {
    const pincode = formData.address.pincode;
    if (pincode.length === 6) {
      fetch(`https://api.postalpincode.in/pincode/${pincode}`)
        .then(res => res.json())
        .then(data => {
          if (data[0].Status === 'Success' && data[0].PostOffice.length > 0) {
            const postOffice = data[0].PostOffice[0];
            setFormData((prev) => ({
              ...prev,
              address: {
                ...prev.address,
                village: postOffice.Name || prev.address.village,
                taluka: postOffice.Block || prev.address.taluka,
                district: postOffice.District || prev.address.district,
                state: postOffice.State || prev.address.state,
              },
            }));
          }
        })
        .catch((err) => {
          console.error('Error fetching pincode data:', err);
          showToast('Failed to fetch location data', 'error');
        });
    }
  }, [formData.address.pincode]);

  const validateStep = (step) => {
    let stepErrors = {};
    let isValid = true;

    switch (step) {
      case 1:
        if (!formData.businessCategory) { stepErrors.businessCategory = 'Business category is required'; isValid = false; }
        if (!formData.shopName.trim()) { stepErrors.shopName = 'Shop name is required'; isValid = false; }
        if (!formData.shopPhone.trim()) { stepErrors.shopPhone = 'Phone number is required'; isValid = false; }
        else if (!/^\d{10}$/.test(formData.shopPhone)) { stepErrors.shopPhone = 'Phone number must be exactly 10 digits'; isValid = false; }
        if (!formData.email.trim()) { stepErrors.email = 'Email is required'; isValid = false; }
        else if (!/\S+@\S+\.\S+/.test(formData.email)) { stepErrors.email = 'Invalid email format'; isValid = false; }
        break;
      case 2:
        if (!formData.address.street.trim()) { stepErrors.address = 'Address is required'; isValid = false; }
        if (!formData.address.pincode.trim()) { stepErrors.pincode = 'PIN code is required'; isValid = false; }
        else if (!/^\d{6}$/.test(formData.address.pincode)) { stepErrors.pincode = 'PIN code must be exactly 6 digits'; isValid = false; }
        if (!formData.address.state.trim()) { stepErrors.state = 'State is required'; isValid = false; }
        break;
      default:
        break;
    }

    setErrors(stepErrors);
    return isValid;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 2));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(2)) {
      showToast('Please fix the errors before submitting.', 'error');
      return;
    }
    setIsSubmitting(true);
    setLoading(true);
    try {
      if (editMode && editIndex?._id) {
        await updateShop(editIndex._id, formData);
        showToast('Retailer updated successfully!', 'success');
      } else {
        await createShop(formData);
        showToast('Registration submitted successfully!', 'success');
      }
      await fetchShops();
      setSuccessMessage('Operation completed successfully!');
    } catch (err) {
      console.error('Submit error:', err);
      showToast('Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
    setTimeout(() => {
      setSuccessMessage('');
      setCurrentStep(1);
      setEditMode(false);
      setEditIndex(null);
      setFormData({
        businessCategory: '',
        shopName: '',
        shopPhone: '',
        email: '',
        website: '',
        address: {
          street: '',
          pincode: '',
          village: '',
          taluka: '',
          district: '',
          state: '',
          country: 'India',
        },
      });
    }, 3000);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="transition-all duration-300">
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">Business Information</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Category *</label>
              <select
                name="businessCategory"
                value={formData.businessCategory}
                onChange={handleChange}
                className={`w-full px-3 py-2.5 border rounded-lg text-base transition-all duration-200 ${errors.businessCategory ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
              >
                <option value="">Select category</option>
                {businessCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.businessCategory && <p className="text-red-600 text-xs mt-1">{errors.businessCategory}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Shop Name *</label>
              <input
                type="text"
                name="shopName"
                value={formData.shopName}
                onChange={handleChange}
                className={`w-full px-3 py-2.5 border rounded-lg text-base transition-all duration-200 ${errors.shopName ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                placeholder="Enter shop name"
              />
              {errors.shopName && <p className="text-red-600 text-xs mt-1">{errors.shopName}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
              <input
                type="tel"
                name="shopPhone"
                value={formData.shopPhone}
                onChange={handleChange}
                maxLength={10}
                className={`w-full px-3 py-2.5 border rounded-lg text-base transition-all duration-200 ${errors.shopPhone ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                placeholder="10-digit phone number"
              />
              {errors.shopPhone && <p className="text-red-600 text-xs mt-1">{errors.shopPhone}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2.5 border rounded-lg text-base transition-all duration-200 ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter live website URL (optional)"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="transition-all duration-300">
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">Location Information</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Shop Address *</label>
              <textarea
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                rows={3}
                className={`w-full px-3 py-2.5 border rounded-lg text-base transition-all duration-200 resize-vertical min-h-[100px] ${errors.address ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                placeholder="Enter complete shop address"
              />
              {errors.address && <p className="text-red-600 text-xs mt-1">{errors.address}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">PIN Code *</label>
                <input
                  type="text"
                  name="address.pincode"
                  value={formData.address.pincode}
                  onChange={handleChange}
                  maxLength={6}
                  className={`w-full px-3 py-2.5 border rounded-lg text-base transition-all duration-200 ${errors.pincode ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                  placeholder="6-digit PIN code"
                />
                {errors.pincode && <p className="text-red-600 text-xs mt-1">{errors.pincode}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Village/Colony</label>
                <input
                  type="text"
                  name="address.village"
                  value={formData.address.village}
                  onChange={handleChange}
                  list="villages-list"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter village/colony (optional)"
                />
                <datalist id="villages-list">
                  {uniqueVillages.map((village) => (
                    <option key={village} value={village} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tahsil/Taluka</label>
                <input
                  type="text"
                  name="address.taluka"
                  value={formData.address.taluka}
                  onChange={handleChange}
                  list="talukas-list"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tahsil/taluka (optional)"
                />
                <datalist id="talukas-list">
                  {uniqueTalukas.map((taluka) => (
                    <option key={taluka} value={taluka} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">District</label>
                <input
                  type="text"
                  name="address.district"
                  value={formData.address.district}
                  onChange={handleChange}
                  list="districts-list"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter district (optional)"
                />
                <datalist id="districts-list">
                  {uniqueDistricts.map((district) => (
                    <option key={district} value={district} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">State *</label>
              <input
                type="text"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                list="states-list"
                className={`w-full px-3 py-2.5 border rounded-lg text-base transition-all duration-200 ${errors.state ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                placeholder="Enter state"
              />
              <datalist id="states-list">
                {uniqueStates.map((state) => (
                  <option key={state} value={state} />
                ))}
              </datalist>
              {errors.state && <p className="text-red-600 text-xs mt-1">{errors.state}</p>}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading && !showDataModal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Success!</h2>
            <p className="text-gray-600 mb-4">{successMessage}</p>
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-1 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast {...toast} onClose={hideToast} />
      
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white shadow-sm md:px-6">
        <h1 className="text-lg font-bold text-gray-800">Retailer Registration</h1>
        <button
          onClick={handleShowDetails}
          className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-full transition hover:bg-indigo-700 hover:-translate-y-0.5"
        >
          Show Details
        </button>
      </nav>

      <div className="max-w-4xl p-4 mx-auto my-4 md:my-8">
        <div className="p-4 mb-4 text-sm border border-gray-200 rounded-lg bg-slate-50">
          <h3 className="mb-2 text-base font-semibold text-gray-800">Keyboard Shortcuts</h3>
          <ul className="flex flex-wrap gap-3 p-0 list-none">
            <li className="px-2 py-1 font-mono bg-gray-200 rounded"><strong>Ctrl + S</strong>: Submit form</li>
            <li className="px-2 py-1 font-mono bg-gray-200 rounded"><strong>Ctrl + N</strong>: Go to next step</li>
            <li className="px-2 py-1 font-mono bg-gray-200 rounded"><strong>Tab / Enter</strong>: Move to the next field</li>
          </ul>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-lg md:p-8">
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              {[1, 2].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium text-sm transition-all duration-300 ${
                    step <= currentStep ? 'bg-blue-500 border-blue-500 text-white animate-pulse' : 'border-gray-300 text-gray-400'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full">
              <div
                className="h-1.5 bg-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep - 1) / 1) * 100}%` }}
              ></div>
            </div>
            <div className="hidden md:flex justify-between mt-2 text-sm text-gray-500">
              <span>Business Info</span>
              <span>Location</span>
            </div>
          </div>

          <div>
            {renderStepContent()}
            <div className="flex flex-col gap-4 pt-6 mt-6 border-t border-gray-200 md:flex-row md:justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="w-full px-5 py-3 text-base font-semibold transition-all duration-200 ease-in-out bg-white border border-gray-300 rounded-lg md:w-auto hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {currentStep < 2 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full px-5 py-3 text-base font-semibold text-white transition-all duration-200 ease-in-out bg-blue-600 rounded-lg md:w-auto hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full px-5 py-3 text-base font-semibold text-white transition-all duration-200 ease-in-out bg-gradient-to-r from-emerald-500 to-blue-600 rounded-lg md:w-auto hover:from-emerald-600 hover:to-blue-700 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                      <span>{editMode ? 'Updating...' : 'Submitting...'}</span>
                    </div>
                  ) : (
                    editMode ? 'Update Retailer' : 'Submit Registration'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal show={showDataModal} onClose={() => setShowDataModal(false)} title="Retailer Details">
        <div className="pb-4 mb-5 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full p-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="">All Categories</option>
              {businessCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              placeholder="Filter by State"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="w-full p-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <input
              placeholder="Filter by District"
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="w-full p-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <input
              placeholder="Filter by Taluka"
              value={filterTaluka}
              onChange={(e) => setFilterTaluka(e.target.value)}
              className="w-full p-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <input
              placeholder="Filter by Village/Colony"
              value={filterVillage}
              onChange={(e) => setFilterVillage(e.target.value)}
              className="w-full p-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="flex w-full gap-2.5">
            <button
              onClick={() => exportToExcel(filteredData)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all duration-200 hover:-translate-y-0.5"
            >
              Export Excel
            </button>
            <button
              onClick={() => exportToPDF(filteredData)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200 hover:-translate-y-0.5"
            >
              Export PDF
            </button>
            <button
              onClick={() => {
                // Clear all filters
                setFilterCategory('');
                setFilterState('');
                setFilterDistrict('');
                setFilterTaluka('');
                setFilterVillage('');
              }}
              className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-200 hover:-translate-y-0.5"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto pr-2.5">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading retailers...</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {filteredData.length} retailer{filteredData.length !== 1 ? 's' : ''}
                {(debouncedCategory || debouncedState || debouncedDistrict || debouncedTaluka || debouncedVillage) && ' (filtered)'}
              </div>
              <ul className="p-0 m-0 list-none space-y-3">
                {filteredData.length > 0 ? (
                  filteredData.map((retailer) => (
                    <li key={retailer._id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm flex justify-between items-start transition-all duration-200 hover:shadow-md hover:bg-gray-100">
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <strong>Shop Name:</strong> {retailer.shopName}<br />
                            <strong>Category:</strong> {retailer.businessCategory}<br />
                            <strong>Phone:</strong> {retailer.shopPhone}<br />
                            <strong>Email:</strong> {retailer.email}
                          </div>
                          <div>
                            <strong>Website:</strong> {retailer.website ? (
                              <a href={retailer.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                {retailer.website.substring(0, 30)}{retailer.website.length > 30 ? '...' : ''}
                              </a>
                            ) : 'N/A'}<br />
                            <strong>Address:</strong> {`${retailer.address.street}${retailer.address.village ? ', ' + retailer.address.village : ''}${retailer.address.taluka ? ', ' + retailer.address.taluka : ''}, ${retailer.address.district}, ${retailer.address.state}, ${retailer.address.pincode}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(retailer)}
                          className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                          disabled={deletingIds.has(retailer._id)}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(retailer._id)}
                          className="px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={deletingIds.has(retailer._id)}
                        >
                          {deletingIds.has(retailer._id) ? (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                              <span>Deleting...</span>
                            </div>
                          ) : (
                            'Delete'
                          )}
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="p-8 text-center text-gray-500 italic bg-gray-50 rounded-lg">
                    {(debouncedCategory || debouncedState || debouncedDistrict || debouncedTaluka || debouncedVillage) 
                      ? 'No retailers found matching the current filters.' 
                      : 'No retailers submitted yet.'}
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default RetailerForm;