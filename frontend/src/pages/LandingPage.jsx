import Recommend from "../components/Recommend";
import Parser from "../components/parser";

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 flex flex-col items-center justify-start py-10 gap-10">
      <Recommend />
      <Parser />
    </div>
  );
}

export default LandingPage;
