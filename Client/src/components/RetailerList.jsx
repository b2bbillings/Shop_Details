import React from 'react';

const RetailerList = ({ retailers }) => {
  // If there are no retailers, display a message.
  if (!retailers || retailers.length === 0) {
    return (
      <div className="mt-4 text-center text-sm text-gray-500">
        No retailers added yet.
      </div>
    );
  }

  return (
    // The main container for the list.
    <div className="mt-4 sm:mt-5">
      <h2 className="mb-3 text-center text-lg font-semibold text-gray-800 sm:text-xl md:text-2xl">
        Registered Retailers
      </h2>
      
      {/* This grid is responsive:
        - On small screens (<768px), it's a single column.
        - On medium screens (≥768px), it's a 2-column grid.
        - On large screens (≥1024px), it's a 3-column grid.
      */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {retailers.map((retailer, index) => (
          <div key={index} className="rounded-md bg-white p-3 shadow sm:p-4">
            <h3 className="mb-2 text-base font-semibold text-gray-800 md:text-lg">
              {retailer.shopName}
            </h3>
            <p className="mb-1 text-sm text-gray-600 md:text-base">
              <strong className="font-medium text-gray-800">Owner:</strong> {retailer.ownerName}
            </p>
            <p className="mb-1 text-sm text-gray-600 md:text-base">
              <strong className="font-medium text-gray-800">Email:</strong> {retailer.email}
            </p>
            <p className="mb-1 text-sm text-gray-600 md:text-base">
              <strong className="font-medium text-gray-800">Mobile:</strong> {retailer.mobile}
            </p>
            <p className="mb-1 text-sm text-gray-600 md:text-base">
              <strong className="font-medium text-gray-800">Category:</strong> {retailer.businessCategory}
            </p>
            <p className="mb-1 text-sm text-gray-600 md:text-base">
              <strong className="font-medium text-gray-800">Type:</strong> {retailer.businessType}
            </p>
            <p className="mb-1 text-sm text-gray-600 md:text-base">
              <strong className="font-medium text-gray-800">Address:</strong> 
              {` ${retailer.address.street}, ${retailer.address.city}, ${retailer.address.state} - ${retailer.address.pincode}`}
            </p>
            
            {/* Conditionally render the services list if it exists and is not empty. */}
            {retailer.servicesOffered && retailer.servicesOffered.length > 0 && (
              <p className="mb-1 text-sm text-gray-600 md:text-base">
                <strong className="font-medium text-gray-800">Services:</strong> {retailer.servicesOffered.join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RetailerList;