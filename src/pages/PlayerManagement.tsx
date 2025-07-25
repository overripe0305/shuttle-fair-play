import { Link } from "react-router-dom";

const PlayerManagement = () => (
  <div className="p-8">
    <Link to="/">
      <button className="mb-4 text-blue-600 underline hover:text-blue-800 transition-colors">
        ← Back to Home
      </button>
    </Link>
    <h1 className="text-2xl font-bold mb-4">Player Management</h1>
    <p>This is where you'll manage all player details. (Feature coming soon!)</p>
  </div>
);

export default PlayerManagement;
