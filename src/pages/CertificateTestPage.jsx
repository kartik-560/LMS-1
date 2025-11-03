import CertificateDownloader from '../components/CertificateDownloader';
import Layout from '../components/layout/Navbar';

const CertificateTestPage = () => {
    const testData1 = {
        student: "Estelle Darcy",
        course: "Career Enhancement Upskilling Course",
    };

    const testData2 = {
        student: "Alexander Maximus Bartholomew III",
        course: "Advanced Quantum Engineering and Applied Metaphysics",
    };

    return (
        
            <div style={{ padding: '2rem' }}>
                <h1>Certificate Test Page</h1>
                <p>This page is for testing the certificate component visually.</p>

                <hr style={{ margin: '2rem 0' }} />

                <h2>Test Case 1: Standard Names</h2>
                <CertificateDownloader
                    studentName={testData1.student}
                    courseName={testData1.course}
                />

                <hr style={{ margin: '2rem 0' }} />

                <h2>Test Case 2: Long Names</h2>
                <CertificateDownloader
                    studentName={testData2.student}
                    courseName={testData2.course}
                />
            </div>
      
    );
};

export default CertificateTestPage;