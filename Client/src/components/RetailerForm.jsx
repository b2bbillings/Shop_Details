import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { utils, write } from "xlsx";
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";

// PDF styling
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "bold",
  },
  shopSection: {
    marginBottom: 15,
    padding: 8,
    border: "1px solid #ccc",
    borderRadius: 6,
  },
  shopName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 10,
    marginBottom: 2,
  },
});

// Mock API functions
const API_BASE =
  process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api";

const createShop = (shopData) =>
  fetch(`${API_BASE}/shops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(shopData),
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to create shop");
    return res.json();
  });

const getShops = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category) params.append("category", filters.category);
  if (filters.state) params.append("state", filters.state);
  if (filters.district) params.append("district", filters.district);
  if (filters.taluka) params.append("taluka", filters.taluka);
  if (filters.village) params.append("village", filters.village);

  return fetch(`${API_BASE}/shops?${params}`).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch shops");
    return res.json();
  });
};

const updateShop = (id, shopData) =>
  fetch(`${API_BASE}/shops/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(shopData),
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to update shop");
    return res.json();
  });

const deleteShop = (id) =>
  fetch(`${API_BASE}/shops/${id}`, {
    method: "DELETE",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to delete shop");
    return res.json();
  });

const getUniqueStates = () =>
  fetch(`${API_BASE}/states`)
    .then((res) => res.json())
    .catch(() => []);
const getUniqueDistricts = () =>
  fetch(`${API_BASE}/districts`)
    .then((res) => res.json())
    .catch(() => []);
const getUniqueTalukas = () =>
  fetch(`${API_BASE}/talukas`)
    .then((res) => res.json())
    .catch(() => []);
const getUniqueVillages = () =>
  fetch(`${API_BASE}/villages`)
    .then((res) => res.json())
    .catch(() => []);

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
    <div
      className={`fixed top-4 right-4 z-[1500] p-4 rounded-lg shadow-lg ${
        type === "success"
          ? "bg-green-500 text-white"
          : type === "error"
          ? "bg-red-500 text-white"
          : "bg-blue-500 text-white"
      } animate-bounce`}
    >
      <div className="flex items-center justify-between">
        <span className="text-base">{message}</span>
        <button
          onClick={onClose}
          className="ml-3 text-white hover:text-gray-200"
        >
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
          className="absolute top-3 right-3 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-gray-200"
          onClick={onClose}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
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

// Capitalize first letter of each word utility function
const capitalizeWords = (str) => {
  if (!str) return "";
  return str.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const RetailerForm = () => {
  const [lastSubmittedCategory, setLastSubmittedCategory] = useState("");
  const [formData, setFormData] = useState({
    businessCategory: lastSubmittedCategory || "",
    ownerName: "",
    shopName: "",
    shopPhone: "",
    email: "",
    website: "",
    address: {
      street: "",
      pincode: "",
      village: "",
      taluka: "",
      district: "",
      state: "",
      country: "India",
    },
  });

  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDataModal, setShowDataModal] = useState(false);
  const [retailers, setRetailers] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterTaluka, setFilterTaluka] = useState("");
  const [filterVillage, setFilterVillage] = useState("");

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
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const categoryRef = useRef(null);
  const ownerNameRef = useRef(null);
  const shopNameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const websiteRef = useRef(null);
  const addressRef = useRef(null);
  const pincodeRef = useRef(null);
  const villageRef = useRef(null);
  const talukaRef = useRef(null);
  const districtRef = useRef(null);
  const stateRef = useRef(null);
  const formTopRef = useRef(null);

  const businessCategories = [
    "Computer and IT",
    "Electronics",
    "Electrical",
    "Automobiles",
  ];

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: "", type: "success" });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (currentStep === 1 && ownerNameRef.current) {
      ownerNameRef.current.focus();
    } else if (currentStep === 2 && addressRef.current) {
      addressRef.current.focus();
    }
  }, [currentStep]);

  useEffect(() => {
    console.log("Current businessCategory:", formData.businessCategory);
  }, [formData.businessCategory]);

  useEffect(() => {
    const fetchUniqueLocations = async () => {
      try {
        const [statesRes, districtsRes, talukasRes, villagesRes] =
          await Promise.all([
            getUniqueStates(),
            getUniqueDistricts(),
            getUniqueTalukas(),
            getUniqueVillages(),
          ]);
        setUniqueStates(statesRes);
        setUniqueDistricts(districtsRes);
        setUniqueTalukas(talukasRes);
        setUniqueVillages(villagesRes);
      } catch (err) {
        console.error("Failed to fetch unique locations:", err);
        showToast("Failed to fetch location data", "error");
      }
    };
    fetchUniqueLocations();
  }, []);

  const fetchShops = useCallback(
    async (filters = {}) => {
      setLoading(true);
      try {
        const data = await getShops(filters);
        console.log("Fetched shops:", data);
        setRetailers(data);
        const locallyFiltered = applyLocalFilters(data, {
          category: debouncedCategory,
          state: debouncedState,
          district: debouncedDistrict,
          taluka: debouncedTaluka,
          village: debouncedVillage,
        });
        setFilteredData(locallyFiltered);
      } catch (err) {
        console.error("Fetch shops error:", err);
        showToast("Failed to fetch retailer data", "error");
      } finally {
        setLoading(false);
      }
    },
    [
      debouncedCategory,
      debouncedState,
      debouncedDistrict,
      debouncedTaluka,
      debouncedVillage,
    ]
  );

  const applyLocalFilters = (data, filters) => {
    if (!data) return [];

    return data.filter((shop) => {
      if (
        filters.category &&
        shop.businessCategory.toLowerCase() !== filters.category.toLowerCase()
      ) {
        return false;
      }
      if (
        filters.state &&
        !shop.address.state.toLowerCase().includes(filters.state.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.district &&
        !shop.address.district
          .toLowerCase()
          .includes(filters.district.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.taluka &&
        !shop.address.taluka
          .toLowerCase()
          .includes(filters.taluka.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.village &&
        !shop.address.village
          .toLowerCase()
          .includes(filters.village.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  };

  useEffect(() => {
    if (retailers.length > 0) {
      const filtered = applyLocalFilters(retailers, {
        category: debouncedCategory,
        state: debouncedState,
        district: debouncedDistrict,
        taluka: debouncedTaluka,
        village: debouncedVillage,
      });
      setFilteredData(filtered);
    }
  }, [
    retailers,
    debouncedCategory,
    debouncedState,
    debouncedDistrict,
    debouncedTaluka,
    debouncedVillage,
  ]);

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
    setFormData({
      ...shop,
      businessCategory: shop.businessCategory || lastSubmittedCategory || "",
      ownerName: shop.ownerName || "",
    });
    setCurrentStep(1);
    setShowDataModal(false);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (formTopRef.current) {
        formTopRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      if (ownerNameRef.current) {
        ownerNameRef.current.focus();
      }
    }, 100);
  };

  const handleDelete = async (id) => {
    if (!id) {
      console.error("Delete error: No ID provided");
      showToast("Cannot delete: Invalid retailer ID", "error");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this retailer?")) {
      return;
    }

    setDeletingIds((prev) => new Set([...prev, id]));

    try {
      await deleteShop(id);
      showToast("Retailer deleted successfully!", "success");
      await fetchShops();
    } catch (err) {
      console.error("Delete error:", err);
      const errorMessage = err.message || "Failed to delete retailer";
      showToast(errorMessage, "error");
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const exportToExcel = (data) => {
    const ws = utils.json_to_sheet(
      data.map((shop) => ({
        "Business Category": shop.businessCategory || "N/A",
        "Owner Name": shop.ownerName || "N/A",
        "Shop Name": shop.shopName || "N/A",
        "Phone Number": shop.shopPhone || "N/A",
        Email: shop.email || "N/A",
        Website: shop.website || "N/A",
        Address: shop.address.street || "N/A",
        "PIN Code": shop.address.pincode || "N/A",
        "Village/Colony": shop.address.village || "N/A",
        Taluka: shop.address.taluka || "N/A",
        District: shop.address.district || "N/A",
        State: shop.address.state || "N/A",
        Country: shop.address.country || "N/A",
      }))
    );
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Shops");
    const excelBuffer = write(wb, { bookType: "xlsx", type: "array" });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(dataBlob, "shops.xlsx");
  };

  const exportToPDF = async (data) => {
    const MyDocument = () => (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>Retailer Data</Text>
          {data.length > 0 ? (
            data.map((shop, index) => (
              <View key={index} style={styles.shopSection}>
                <Text style={styles.shopName}>{shop.shopName || "N/A"}</Text>
                <Text style={styles.detailText}>
                  Owner: {shop.ownerName || "N/A"}
                </Text>
                <Text style={styles.detailText}>
                  Category: {shop.businessCategory || "N/A"}
                </Text>
                <Text style={styles.detailText}>
                  Phone: {shop.shopPhone || "N/A"}
                </Text>
                <Text style={styles.detailText}>
                  Email: {shop.email || "N/A"}
                </Text>
                <Text style={styles.detailText}>
                  Website: {shop.website || "N/A"}
                </Text>
                <Text style={styles.detailText}>
                  Address:{" "}
                  {`${shop.address.street || ""}${
                    shop.address.village ? ", " + shop.address.village : ""
                  }${shop.address.taluka ? ", " + shop.address.taluka : ""}, ${
                    shop.address.district || "N/A"
                  }, ${shop.address.state || "N/A"}, ${
                    shop.address.pincode || "N/A"
                  }, ${shop.address.country || "N/A"}`}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.detailText}>No data available.</Text>
          )}
        </Page>
      </Document>
    );

    const blob = await pdf(<MyDocument />).toBlob();
    saveAs(blob, "shops.pdf");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (!name.includes("email") && !name.includes("website")) {
      processedValue = capitalizeWords(value);
    }

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: processedValue },
      }));
      if (errors[child]) {
        setErrors((prev) => ({ ...prev, [child]: "" }));
      }
    } else {
      setFormData((prev) => {
        console.log(`Updating ${name} to:`, processedValue);
        return {
          ...prev,
          [name]: processedValue,
        };
      });
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    }
  };

  const handleKeyPress = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      } else if (currentStep === 1) {
        nextStep();
      } else if (currentStep === 2) {
        handleSubmit(e);
      }
    }
  };

  useEffect(() => {
    const pincode = formData.address.pincode;
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      const fetchPincodeData = async (apiUrl, retries = 1) => {
        try {
          console.log(`Fetching PIN ${pincode} from ${apiUrl}`);
          const response = await fetch(apiUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'YourApp/1.0',
            },
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          console.log(`API Response for ${pincode}:`, data);

          let postOfficeData = null;
          if (apiUrl.includes('postalpincode.in')) {
            if (Array.isArray(data) && data.length > 0 && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
              postOfficeData = data[0].PostOffice[0];
            }
          } else if (apiUrl.includes('apitier.com')) {
            if (data.success && data.data) {
              postOfficeData = {
                State: data.data.state,
                District: data.data.district,
                Block: data.data.block || data.data.taluk,
                Name: data.data.village || data.data.area,
              };
            }
          }

          if (postOfficeData) {
            setFormData((prev) => ({
              ...prev,
              address: {
                ...prev.address,
                village: capitalizeWords(postOfficeData.Name || prev.address.village || ''),
                taluka: capitalizeWords(postOfficeData.Block || prev.address.taluka || ''),
                district: capitalizeWords(postOfficeData.District || prev.address.district || ''),
                state: capitalizeWords(postOfficeData.State || prev.address.state || ''),
              },
            }));
            showToast(`Location updated for PIN ${pincode}!`, 'success');
            return;
          } else {
            throw new Error('No valid post office data in response');
          }
        } catch (error) {
          console.error(`PIN fetch error for ${pincode}:`, error);
          if (retries > 0) {
            console.log(`Retrying with fallback API...`);
            return fetchPincodeData('https://api.apitier.com/v1/pincode/' + pincode, 0);
          }
          showToast(`Failed to fetch for PIN ${pincode}. Enter manually.`, 'error');
        }
      };

      fetchPincodeData(`https://api.postalpincode.in/pincode/${pincode}`);
    }
  }, [formData.address.pincode]);

  const validateStep = (step) => {
    let stepErrors = {};
    let isValid = true;

    switch (step) {
      case 1:
        if (!formData.businessCategory) {
          stepErrors.businessCategory = "Business category is required";
          isValid = false;
        }
        if (!formData.ownerName.trim()) {
          stepErrors.ownerName = "Owner name is required";
          isValid = false;
        }
        if (!formData.shopName.trim()) {
          stepErrors.shopName = "Shop name is required";
          isValid = false;
        }
        if (!formData.shopPhone.trim()) {
          stepErrors.shopPhone = "Phone number is required";
          isValid = false;
        } else if (!/^\d{10}$/.test(formData.shopPhone)) {
          stepErrors.shopPhone = "Phone number must be exactly 10 digits";
          isValid = false;
        }
        if (!formData.email.trim()) {
          stepErrors.email = "Email is required";
          isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          stepErrors.email = "Invalid email format";
          isValid = false;
        }
        break;
      case 2:
        if (!formData.address.street.trim()) {
          stepErrors.address = "Address is required";
          isValid = false;
        }
        if (!formData.address.pincode.trim()) {
          stepErrors.pincode = "PIN code is required";
          isValid = false;
        } else if (!/^\d{6}$/.test(formData.address.pincode)) {
          stepErrors.pincode = "PIN code must be exactly 6 digits";
          isValid = false;
        }
        if (!formData.address.state.trim()) {
          stepErrors.state = "State is required";
          isValid = false;
        }
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

  const resetForm = () => {
    console.log(
      "Resetting form with lastSubmittedCategory:",
      lastSubmittedCategory
    );
    setFormData({
      businessCategory: lastSubmittedCategory || "",
      ownerName: "",
      shopName: "",
      shopPhone: "",
      email: "",
      website: "",
      address: {
        street: "",
        pincode: "",
        village: "",
        taluka: "",
        district: "",
        state: "",
        country: "India",
      },
    });
    setCurrentStep(1);
    setEditMode(false);
    setEditIndex(null);
    setErrors({});

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (formTopRef.current) {
        formTopRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      if (ownerNameRef.current) {
        ownerNameRef.current.focus();
      }
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(2)) {
      showToast("Please fix the errors before submitting.", "error");
      return;
    }
    setIsSubmitting(true);
    setLoading(true);
    try {
      const shopData = {
        ...formData,
        ownerName: formData.ownerName.trim(),
      };
      if (editMode && editIndex?._id) {
        await updateShop(editIndex._id, shopData);
        showToast("Retailer updated successfully!", "success");
      } else {
        await createShop(shopData);
        setLastSubmittedCategory(formData.businessCategory);
        console.log(
          "Updated lastSubmittedCategory to:",
          formData.businessCategory
        );
        showToast("Registration submitted successfully!", "success");
      }
      await fetchShops();
      setSuccessMessage("Operation completed successfully!");
    } catch (err) {
      console.error("Submit error:", err);
      showToast("Operation failed: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
    setTimeout(() => {
      setSuccessMessage("");
      resetForm();
    }, 3000);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="transition-all duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Business Information
            </h3>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Category *
              </label>
              <select
                ref={categoryRef}
                name="businessCategory"
                value={formData.businessCategory}
                onChange={handleChange}
                onKeyPress={(e) => handleKeyPress(e, ownerNameRef)}
                className={`w-full px-3 py-2 border rounded-lg text-base transition-all duration-200 ${
                  errors.businessCategory
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                }`}
              >
                <option value="">Select category</option>
                {businessCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.businessCategory && (
                <p className="text-red-600 text-sm mt-0.5">
                  {errors.businessCategory}
                </p>
              )}
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name *
              </label>
              <input
                ref={ownerNameRef}
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                onKeyPress={(e) => handleKeyPress(e, shopNameRef)}
                className={`w-full px-3 py-2 border rounded-lg text-base transition-all duration-200 ${
                  errors.ownerName
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                }`}
                placeholder="Enter owner name"
              />
              {errors.ownerName && (
                <p className="text-red-600 text-sm mt-0.5">
                  {errors.ownerName}
                </p>
              )}
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Name *
              </label>
              <input
                ref={shopNameRef}
                type="text"
                name="shopName"
                value={formData.shopName}
                onChange={handleChange}
                onKeyPress={(e) => handleKeyPress(e, phoneRef)}
                className={`w-full px-3 py-2 border rounded-lg text-base transition-all duration-200 ${
                  errors.shopName
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                }`}
                placeholder="Enter shop name"
              />
              {errors.shopName && (
                <p className="text-red-600 text-sm mt-0.5">{errors.shopName}</p>
              )}
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                ref={phoneRef}
                type="tel"
                name="shopPhone"
                value={formData.shopPhone}
                onChange={handleChange}
                onKeyPress={(e) => handleKeyPress(e, emailRef)}
                maxLength={10}
                className={`w-full px-3 py-2 border rounded-lg text-base transition-all duration-200 ${
                  errors.shopPhone
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                }`}
                placeholder="10-digit phone number"
              />
              {errors.shopPhone && (
                <p className="text-red-600 text-sm mt-0.5">
                  {errors.shopPhone}
                </p>
              )}
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                ref={emailRef}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onKeyPress={(e) => handleKeyPress(e, websiteRef)}
                className={`w-full px-3 py-2 border rounded-lg text-base transition-all duration-200 ${
                  errors.email
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                }`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-0.5">{errors.email}</p>
              )}
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                ref={websiteRef}
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                onKeyPress={(e) => handleKeyPress(e, null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base transition-all duration-200 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter website URL (optional)"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="transition-all duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Location Information
            </h3>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Address *
              </label>
              <textarea
                ref={addressRef}
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                onKeyPress={(e) => handleKeyPress(e, pincodeRef)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg text-base transition-all duration-200 resize-vertical min-h-[80px] ${
                  errors.address
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                }`}
                placeholder="Enter complete shop address"
              />
              {errors.address && (
                <p className="text-red-600 text-sm mt-0.5">{errors.address}</p>
              )}
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN Code *
              </label>
              <input
                ref={pincodeRef}
                type="text"
                name="address.pincode"
                value={formData.address.pincode}
                onChange={handleChange}
                onKeyPress={(e) => handleKeyPress(e, villageRef)}
                maxLength={6}
                className={`w-full px-3 py-2 border rounded-lg text-base transition-all duration-200 ${
                  errors.pincode
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                }`}
                placeholder="6-digit PIN code"
              />
              {errors.pincode && (
                <p className="text-red-600 text-sm mt-0.5">{errors.pincode}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Village/Colony
                </label>
                <input
                  ref={villageRef}
                  type="text"
                  name="address.village"
                  value={formData.address.village}
                  onChange={handleChange}
                  onKeyPress={(e) => handleKeyPress(e, talukaRef)}
                  list="villages-list"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base transition-all duration-200 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter village/colony (optional)"
                />
                <datalist id="villages-list">
                  {uniqueVillages.map((village) => (
                    <option key={village} value={village} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tahsil/Taluka
                </label>
                <input
                  ref={talukaRef}
                  type="text"
                  name="address.taluka"
                  value={formData.address.taluka}
                  onChange={handleChange}
                  onKeyPress={(e) => handleKeyPress(e, districtRef)}
                  list="talukas-list"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base transition-all duration-200 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tahsil/taluka (optional)"
                />
                <datalist id="talukas-list">
                  {uniqueTalukas.map((taluka) => (
                    <option key={taluka} value={taluka} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District
                </label>
                <input
                  ref={districtRef}
                  type="text"
                  name="address.district"
                  value={formData.address.district}
                  onChange={handleChange}
                  onKeyPress={(e) => handleKeyPress(e, stateRef)}
                  list="districts-list"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base transition-all duration-200 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter district (optional)"
                />
                <datalist id="districts-list">
                  {uniqueDistricts.map((district) => (
                    <option key={district} value={district} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  ref={stateRef}
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  onKeyPress={(e) => handleKeyPress(e, null)}
                  list="states-list"
                  className={`w-full px-3 py-2 border rounded-lg text-base transition-all duration-200 ${
                    errors.state
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  }`}
                  placeholder="Enter state"
                />
                <datalist id="states-list">
                  {uniqueStates.map((state) => (
                    <option key={state} value={state} />
                  ))}
                </datalist>
                {errors.state && (
                  <p className="text-red-600 text-sm mt-0.5">{errors.state}</p>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (currentStep === 2) {
          handleSubmit(e);
        }
      }
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        if (currentStep === 1) {
          nextStep();
        }
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [currentStep, handleSubmit, nextStep]);

  if (loading && !showDataModal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-base text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center min-h-screen z-[2000] p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Success!</h2>
            <p className="text-base text-gray-600 mb-4">{successMessage}</p>
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

      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-white shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">
          Retailer Registration
        </h1>
        <button
          onClick={handleShowDetails}
          className="px-4 py-2 text-base font-semibold text-white bg-indigo-600 rounded-full transition hover:bg-indigo-700 hover:-translate-y-0.5"
        >
          Show Details
        </button>
      </nav>

      <div className="max-w-5xl p-4 mx-auto my-10" ref={formTopRef}>
        <div className="p-4 mb-4 text-sm border border-gray-200 rounded-2xl bg-slate-50">
          <h3 className="mb-2 text-xl font-semibold text-gray-800">
            Keyboard Shortcuts
          </h3>
          <ul className="flex flex-wrap gap-2 p-0 list-none">
            <li className="px-2 py-1 font-mono bg-gray-200 rounded">
              <strong>Ctrl + S</strong>: Submit form
            </li>
            <li className="px-2 py-1 font-mono bg-gray-200 rounded">
              <strong>Enter</strong>: Next field
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 max-h-[90vh] overflow-y-auto">
          {renderStepContent()}
          <div className="flex flex-col gap-4 mt-4 md:flex-row md:justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="w-full px-4 py-2 text-base font-semibold transition-all duration-200 bg-white border border-gray-300 rounded-lg md:w-auto hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {currentStep < 2 ? (
              <button
                type="button"
                onClick={nextStep}
                className="w-full px-4 py-2 text-base font-semibold text-white transition-all duration-200 bg-blue-600 rounded-lg md:w-auto hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full px-4 py-2 text-base font-semibold text-white transition-all duration-200 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-lg md:w-auto hover:from-emerald-600 hover:to-blue-700 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                    <span>{editMode ? "Updating..." : "Submitting..."}</span>
                  </div>
                ) : editMode ? (
                  "Update Retailer"
                ) : (
                  "Submit Registration"
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal
        show={showDataModal}
        onClose={() => setShowDataModal(false)}
        title="Retailer Details"
      >
        <div className="pb-4 mb-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="">All Categories</option>
              {businessCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              placeholder="Filter by State"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <input
              placeholder="Filter by District"
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              placeholder="Filter by Taluka"
              value={filterTaluka}
              onChange={(e) => setFilterTaluka(e.target.value)}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <input
              placeholder="Filter by Village/Colony"
              value={filterVillage}
              onChange={(e) => setFilterVillage(e.target.value)}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="flex w-full gap-3">
            <button
              onClick={() => exportToExcel(filteredData)}
              className="flex-1 px-4 py-2 text-base font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all duration-200 hover:-translate-y-0.5"
            >
              Export Excel
            </button>
            <button
              onClick={() => exportToPDF(filteredData)}
              className="flex-1 px-4 py-2 text-base font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200 hover:-translate-y-0.5"
            >
              Export PDF
            </button>
            <button
              onClick={() => {
                setFilterCategory("");
                setFilterState("");
                setFilterDistrict("");
                setFilterTaluka("");
                setFilterVillage("");
              }}
              className="px-4 py-2 text-base font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-200 hover:-translate-y-0.5"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto pr-2">
          {loading ? (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-base text-gray-600">
                Loading retailers...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 text-base text-gray-600">
                Showing {filteredData.length} retailer
                {filteredData.length !== 1 ? "s" : ""}
                {(debouncedCategory ||
                  debouncedState ||
                  debouncedDistrict ||
                  debouncedTaluka ||
                  debouncedVillage) &&
                  " (filtered)"}
              </div>
              <ul className="p-0 m-0 list-none space-y-2">
                {filteredData.length > 0 ? (
                  filteredData.map((retailer) => (
                    <li
                      key={retailer._id}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-base flex justify-between items-start transition-all duration-200 hover:shadow-md hover:bg-gray-100"
                    >
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <strong>Owner Name:</strong>{" "}
                            {retailer.ownerName || "N/A"}
                            <br />
                            <strong>Shop Name:</strong>{" "}
                            {retailer.shopName || "N/A"}
                            <br />
                            <strong>Category:</strong>{" "}
                            {retailer.businessCategory || "N/A"}
                            <br />
                            <strong>Phone:</strong>{" "}
                            {retailer.shopPhone || "N/A"}
                            <br />
                            <strong>Email:</strong> {retailer.email || "N/A"}
                          </div>
                          <div>
                            <strong>Website:</strong>{" "}
                            {retailer.website ? (
                              <a
                                href={retailer.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                {retailer.website.substring(0, 25)}
                                {retailer.website.length > 25 ? "..." : ""}
                              </a>
                            ) : (
                              "N/A"
                            )}
                            <br />
                            <strong>Address:</strong>{" "}
                            {`${retailer.address.street || "N/A"}${
                              retailer.address.village
                                ? ", " + retailer.address.village
                                : ""
                            }${
                              retailer.address.taluka
                                ? ", " + retailer.address.taluka
                                : ""
                            }, ${retailer.address.district || "N/A"}, ${
                              retailer.address.state || "N/A"
                            }, ${retailer.address.pincode || "N/A"}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(retailer)}
                          className="px-3 py-2 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                          disabled={deletingIds.has(retailer._id)}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(retailer._id)}
                          className="px-3 py-2 text-base font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={deletingIds.has(retailer._id)}
                        >
                          {deletingIds.has(retailer._id) ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                              <span>Deleting...</span>
                            </div>
                          ) : (
                            "Delete"
                          )}
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="p-6 text-center text-gray-500 italic bg-gray-50 rounded-lg text-base">
                    {debouncedCategory ||
                    debouncedState ||
                    debouncedDistrict ||
                    debouncedTaluka ||
                    debouncedVillage
                      ? "No retailers found matching the current filters."
                      : "No retailers submitted yet."}
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

const root = createRoot(document.getElementById("root"));
root.render(<RetailerForm />);

export default RetailerForm;