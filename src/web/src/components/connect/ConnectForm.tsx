import React, { useState, useEffect } from 'react'; // React core library for UI components
import { FormField } from '../common/FormField'; // Reusable form field component
import { Button } from '../common/Button'; // Reusable button component
import { useForm } from '../../hooks/useForm'; // Custom hook for form state management
import { validateEmail } from '../../lib/utils/validation'; // Utility function for email validation
import { useConnectionStore } from '../../store/connectionStore'; // Global state store for connection management
import { useAgentStore } from '../../store/agentStore'; // Global state store for agent information

// Define the properties for the ConnectForm component
interface ConnectFormProps {
  onSearchResults: (results: any[]) => void; // Callback function to handle search results
  className?: string; // Optional CSS class name for styling
}

/**
 * A form component for searching and connecting with other users
 * @param {ConnectFormProps} props - The properties for the component
 * @returns {JSX.Element} Rendered connect form component
 */
export const ConnectForm: React.FC<ConnectFormProps> = ({ onSearchResults, className }) => {
  // LD1: Extract onSearchResults callback from props
  // LD2: This callback is used to pass the search results to the parent component

  // LD1: Get currentAgent from useAgentStore
  // LD2: This is used to prevent searching for the current user
  const { currentAgent } = useAgentStore();

  // LD1: Get searchUsers and loading from useConnectionStore
  // LD2: searchUsers is the function to perform the search, loading indicates if a search is in progress
  const { searchUsers, loading } = useConnectionStore();

  // LD1: Initialize form state with useForm hook
  // LD2: This hook manages the form values, errors, and submission state
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useForm({
    initialValues: { searchTerm: '' },
    validationSchema: createValidationSchema(),
  });

  // LD1: Initialize searchPerformed state with useState
  // LD2: This state is used to indicate if a search has been performed
  const [searchPerformed, setSearchPerformed] = useState(false);

  // LD1: Create validation schema for search input
  // LD2: This schema defines the validation rules for the search input
  function createValidationSchema() {
    return {
      searchTerm: (value: string) => {
        if (!value) {
          return 'Search term is required';
        }
        if (value.includes('@') && !validateEmail(value)) {
          return 'Invalid email format';
        }
        return null;
      },
    };
  }

  // LD1: Define handleSearch function to process search submissions
  // LD2: This function calls the searchUsers function from the connectionStore
  const handleSearch = async () => {
    // LD1: Extract searchTerm from form values
    // LD2: This is the value entered by the user in the search input
    const { searchTerm } = values;

    // LD1: Check if currentAgent exists
    // LD2: If currentAgent does not exist, log an error and return
    if (!currentAgent) {
      console.error('Current agent is not available.');
      return;
    }

    try {
      // LD1: Call searchUsers function from connectionStore with the search term
      // LD2: This function performs the actual search for users
      const results = await searchUsers(searchTerm);

      // LD1: Set searchPerformed state to true
      // LD2: This indicates that a search has been performed
      setSearchPerformed(true);

      // LD1: Call onSearchResults callback with search results
      // LD2: This passes the search results to the parent component
      onSearchResults(results);
    } catch (error) {
      // LD1: Handle any errors that occur during search
      // LD2: Log the error to the console
      console.error('Search failed:', error);
    }
  };

  // LD1: Render form with FormField for search input and Button for submission
  // LD2: The FormField component is a reusable form field with label and error display
  return (
    <form onSubmit={handleSubmit(handleSearch)} className={className}>
      <FormField
        id="searchTerm"
        name="searchTerm"
        label="Search users by email or name:"
        placeholder="Enter email or name"
        value={values.searchTerm}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.searchTerm}
        touched={touched.searchTerm}
        fullWidth
      />
      {/* LD1: Display validation errors if present */}
      {errors.searchTerm && touched.searchTerm && (
        <div className="text-red-500 text-sm mt-1">{errors.searchTerm}</div>
      )}
      {/* LD1: Show loading state during search operations */}
      <Button type="submit" disabled={loading} isLoading={loading} fullWidth>
        {loading ? 'Searching...' : 'Search'}
      </Button>
    </form>
  );
};