import { X } from "lucide-react";
import Button from "./Button";

export default function EditCourseModal({ isOpen, onClose, onEditCourse, onEditFinalTest }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Edit Options
          </h2>
          <p className="text-gray-600 mb-6">
            Choose what you want to edit
          </p>

          {/* Buttons */}
          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={onEditCourse}
            >
              Edit Course
            </Button>
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={onEditFinalTest}
            >
              Edit Final Test
            </Button>
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
