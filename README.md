# 🌿 Crop Doctor AI 🌾

A React application for analyzing crop images to detect diseases and provide cure recommendations using Google's Gemini AI and Supabase.

## ✨ Features

* **Image Upload:** Easily upload crop images to Supabase Storage.
* **AI Analysis:** Utilizes Google's Gemini Pro Vision model to analyze uploaded images for disease detection.
* **Disease & Cure Recommendations:** Provides identified disease names, cure instructions, and next steps.
* **Upload History:** Keeps a record of all past uploads and their analysis results.
* **Responsive Design:** (Implicit from general React practices and modern CSS)

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js**: [Download & Install Node.js](https://nodejs.org/en/download/) (which includes npm)
* **npm** (Node Package Manager) or **Yarn**

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [your-repo-url]
    cd your-crop-doctor-app
    ```
2.  **Install dependencies:**
    This project uses the following key dependencies for its functionality:
    * `react` and `react-dom` for the user interface.
    * `@supabase/supabase-js` for database and storage interactions.
    * `@google/generative-ai` for integrating with the Gemini AI model.

    To install all project dependencies, run one of the following commands in the project's root directory:

    ```bash
    # Using npm
    npm install

    # Or using Yarn
    yarn install
    ```

### Supabase Setup

1.  **Create a Supabase Project:**
    * Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Set up Storage Bucket:**
    * In your Supabase project, navigate to "Storage".
    * Create a new bucket named `crop-pictures`.
    * Set its security policy to `Public` for easy access in this demo (for production, implement Row Level Security and authentication).
3.  **Set up Database Table:**
    * Navigate to "Table Editor".
    * Create a new table named `crop_images` with the following columns:
        * `id`: `uuid` (Primary Key, Default Value: `gen_random_uuid()`)
        * `created_at`: `timestampz` (Default Value: `now()`)
        * `image_url`: `text`
        * `file_name`: `text`
        * `disease_name`: `text` (nullable)
        * `cure_instructions`: `text` (nullable)
        * `next_steps_if_not_curable`: `text` (nullable)
        * `ai_analysis_completed`: `boolean` (Default Value: `false`)
        * `ai_error_message`: `text` (nullable)
        * `user_id`: `uuid` (Optional: if you plan to implement user authentication later)
4.  **Get Supabase Credentials:**
    * Go to "Project Settings" -> "API".
    * Copy your `Project URL` and `anon public` key.

### Google Gemini API Key

1.  **Get a Google Gemini API Key:**
    * Go to [Google AI Studio](https://aistudio.google.com/app/apikey) to generate an API key.

### Environment Variables

Create a `.env` file in the root of your project and add your credentials:

```dotenv
VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"