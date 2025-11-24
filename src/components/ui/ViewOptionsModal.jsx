import { X } from "lucide-react";
import Button from "./Button";

export default function ViewOptionsModal({ isOpen, onClose, onViewFinalTest, onViewCourse }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose}></div>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>

          <h2 className="text-xl font-bold text-gray-900 mb-4">Select View Option</h2>

          <div className="space-y-4">
            <Button variant="primary" className="w-full" onClick={onViewFinalTest}>
              View Final Test
            </Button>
            <Button variant="outline" className="w-full" onClick={onViewCourse}>
              View Course
            </Button>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
