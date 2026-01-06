// Mock wind data for testing - More realistic and complex wind patterns
const generateComplexWindData = (width, height, baseSpeed, turbulence, rotation) => {
  const array = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create complex wind patterns using sine and cosine functions
      // Base wind direction with some rotation
      const angle = rotation + Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.5;
      
      // Add turbulence and variation
      const turbulenceFactor = 1 + (Math.random() - 0.5) * turbulence;
      const xVariation = Math.sin(y * 0.3 + x * 0.4) * 0.5;
      const yVariation = Math.cos(x * 0.3 + y * 0.4) * 0.5;
      
      // Generate speed with variation
      const speed = baseSpeed * (0.8 + Math.random() * 0.4) * turbulenceFactor;
      
      // Calculate u and v components with complex patterns
      const u = Math.cos(angle) * speed + xVariation;
      const v = Math.sin(angle) * speed + yVariation;
      
      array.push(u, v);
    }
  }
  return array;
};

// Generate wind data for different heights with realistic variations
const generateLayerWindData = (width, height, heightLevel) => {
  // Higher heights have stronger winds and more complex patterns
  const baseSpeed = 2 + (heightLevel / 1000) * 3;
  const turbulence = 0.3 + (heightLevel / 1000) * 0.2;
  
  // Different heights have slightly different base directions
  const rotation = (heightLevel / 500) * Math.PI / 4;
  
  const allData = generateComplexWindData(width, height, baseSpeed, turbulence, rotation);
  
  // Split into u and v components
  const u = [];
  const v = [];
  for (let i = 0; i < allData.length; i += 2) {
    u.push(allData[i]);
    v.push(allData[i + 1]);
  }
  
  return {
    u: {
      array: u,
      min: Math.min(...u),
      max: Math.max(...u)
    },
    v: {
      array: v,
      min: Math.min(...v),
      max: Math.max(...v)
    },
    width,
    height
  };
};

// Create mock wind data with 8x8 grid and complex patterns
const width = 8;
const height = 8;
const mockWindData = {
  "time": "2025-01-01T10:00:00",
  "layers": [
    {
      "height": 50,
      "windData": {
        ...generateLayerWindData(width, height, 50),
        "bounds": {
          "west": 120.30,
          "south": 36.05,
          "east": 120.45,
          "north": 36.20
        }
      }
    },
    {
      "height": 150,
      "windData": {
        ...generateLayerWindData(width, height, 1000),
        "bounds": {
          "west": 120.30,
          "south": 36.05,
          "east": 120.45,
          "north": 36.20
        }
      }
    },
    {
      "height": 200,
      "windData": {
        ...generateLayerWindData(width, height, 2000),
        "bounds": {
          "west": 120.30,
          "south": 36.05,
          "east": 120.45,
          "north": 36.20
        }
      }
    }
  ]
};

export default mockWindData;