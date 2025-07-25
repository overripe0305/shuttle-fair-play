// src/pages/Home.tsx
import { Link } from "react-router-dom";

const Home = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background">
    <h1 className="text-3xl font-bold mb-8">Welcome to Shuttle Fair Play</h1>
    <div className="flex gap-8">
      <Link to="/app">
        <button className="bg-blue-600 text-white font-medium rounded px-8 py-4 text-xl hover:bg-blue-700 transition-colors">
          Main Queue App
        </button>
      </Link>
      <Link to="/players">
        <button className="bg-green-600 text-white font-medium rounded px-8 py-4 text-xl hover:bg-green-700 transition-colors">
          Player Management
        </button>
      </Link>
    </div>
  </div>
);

export default Home;
