import React, { useState } from "react";
import RetailerForm from "./components/RetailerForm";
import RetailerList from "./components/RetailerList";
import "./App.css";


function App() {
  const [retailers, setRetailers] = useState([]);
  const [showList, setShowList] = useState(false);

  const addRetailer = (newRetailer) => {
    setRetailers([...retailers, newRetailer]);
  };

  return (
    <div className="app-container">
      <h1>Retailer Business Directory</h1>
      <RetailerForm onAddRetailer={addRetailer} />
      {/* <button className="show-btn" onClick={() => setShowList(!showList)}>
        {showList ? "Hide Details" : "Show All Retailer Details"}
      </button> */}
      {showList && <RetailerList retailers={retailers} />}
    </div>
  );
}

export default App;