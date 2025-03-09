#!/bin/bash
# -----------------------------------------------------------------------------
# Comprehensive dependency scanning script for the AI Agent Network project
# This script scans dependencies across the project to identify security
# vulnerabilities, outdated packages, and potential licensing issues.
# -----------------------------------------------------------------------------

# Global variables
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
FRONTEND_DIR=$ROOT_DIR/src/web
BACKEND_DIR=$ROOT_DIR/src/backend
REPORTS_DIR=$SCRIPT_DIR/reports
SCAN_LEVEL="standard"
EXIT_CODE=0
CRITICAL_VULNERABILITIES=0
HIGH_VULNERABILITIES=0

# Function to check if required dependencies are installed
check_dependencies() {
    local missing_deps=0
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        echo "Error: npm is required but not installed."
        missing_deps=1
    fi
    
    # Check for jq
    if ! command -v jq &> /dev/null; then
        echo "Error: jq is required but not installed."
        missing_deps=1
    fi
    
    # Check for snyk (optional for deep scanning)
    if [ "$SCAN_LEVEL" = "deep" ] && ! command -v snyk &> /dev/null; then
        echo "Warning: snyk is not installed. Deep scanning will be limited."
        echo "  Install with: npm install -g snyk"
    fi
    
    # Check for trivy (optional for container scanning)
    if ! command -v trivy &> /dev/null; then
        echo "Warning: trivy is not installed. Docker image scanning will be skipped."
        echo "  Install instructions: https://aquasecurity.github.io/trivy/latest/getting-started/installation/"
    fi
    
    return $missing_deps
}

# Function to set up the environment for scanning
setup_environment() {
    # Create reports directory if it doesn't exist
    mkdir -p "$REPORTS_DIR"
    
    # Get current timestamp for report filenames
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    
    echo "========================================================"
    echo "Dependency Scanning: AI Agent Network"
    echo "Scan level: $SCAN_LEVEL"
    echo "Timestamp: $(date)"
    echo "========================================================"
    echo
}

# Function to scan frontend dependencies
scan_frontend_dependencies() {
    local frontend_exit_code=0
    
    echo "Scanning frontend dependencies..."
    
    # Change to frontend directory
    cd "$FRONTEND_DIR" || { 
        echo "Error: Frontend directory not found at $FRONTEND_DIR"; 
        return 10; 
    }
    
    # Create scan report filename
    local npm_report="$REPORTS_DIR/frontend_npm_audit_$TIMESTAMP.json"
    local npm_report_html="$REPORTS_DIR/frontend_npm_audit_$TIMESTAMP.html"
    
    # Run npm audit
    echo "Running npm audit..."
    npm audit --json > "$npm_report" || true
    
    # Parse npm audit results
    local vuln_counts
    vuln_counts=$(parse_npm_audit "$npm_report")
    local critical=$(echo "$vuln_counts" | jq -r '.critical')
    local high=$(echo "$vuln_counts" | jq -r '.high')
    local moderate=$(echo "$vuln_counts" | jq -r '.moderate')
    local low=$(echo "$vuln_counts" | jq -r '.low')
    
    # Update global counters
    CRITICAL_VULNERABILITIES=$((CRITICAL_VULNERABILITIES + critical))
    HIGH_VULNERABILITIES=$((HIGH_VULNERABILITIES + high))
    
    # Generate human-readable report
    npm audit --no-color > "$npm_report_html" 2>&1 || true
    
    # Run snyk test if available and scan level is deep
    if [ "$SCAN_LEVEL" = "deep" ] && command -v snyk &> /dev/null; then
        local snyk_report="$REPORTS_DIR/frontend_snyk_$TIMESTAMP.json"
        echo "Running Snyk test..."
        snyk test --json > "$snyk_report" || true
        
        # Parse snyk results
        if [ -f "$snyk_report" ]; then
            local snyk_counts
            snyk_counts=$(parse_snyk_results "$snyk_report")
            local snyk_critical=$(echo "$snyk_counts" | jq -r '.critical')
            local snyk_high=$(echo "$snyk_counts" | jq -r '.high')
            
            # Update global counters with Snyk results
            CRITICAL_VULNERABILITIES=$((CRITICAL_VULNERABILITIES + snyk_critical))
            HIGH_VULNERABILITIES=$((HIGH_VULNERABILITIES + snyk_high))
            
            # Update local counters for summary
            critical=$((critical + snyk_critical))
            high=$((high + snyk_high))
        fi
    fi
    
    # Print summary
    echo "Frontend dependency scan complete."
    echo "Vulnerabilities found: $critical critical, $high high, $moderate moderate, $low low"
    echo "Reports saved to:"
    echo "  - $npm_report"
    echo "  - $npm_report_html"
    if [ -f "$snyk_report" ]; then
        echo "  - $snyk_report"
    fi
    echo
    
    # Set exit code based on vulnerability severity
    if [ "$critical" -gt 0 ]; then
        frontend_exit_code=3
    elif [ "$high" -gt 0 ]; then
        frontend_exit_code=2
    elif [ "$moderate" -gt 0 ]; then
        frontend_exit_code=1
    fi
    
    return $frontend_exit_code
}

# Function to scan backend dependencies
scan_backend_dependencies() {
    local backend_exit_code=0
    
    echo "Scanning backend dependencies..."
    
    # Change to backend directory
    cd "$BACKEND_DIR" || { 
        echo "Error: Backend directory not found at $BACKEND_DIR"; 
        return 10; 
    }
    
    # Create scan report filename
    local npm_report="$REPORTS_DIR/backend_npm_audit_$TIMESTAMP.json"
    local npm_report_html="$REPORTS_DIR/backend_npm_audit_$TIMESTAMP.html"
    
    # Run npm audit
    echo "Running npm audit..."
    npm audit --json > "$npm_report" || true
    
    # Parse npm audit results
    local vuln_counts
    vuln_counts=$(parse_npm_audit "$npm_report")
    local critical=$(echo "$vuln_counts" | jq -r '.critical')
    local high=$(echo "$vuln_counts" | jq -r '.high')
    local moderate=$(echo "$vuln_counts" | jq -r '.moderate')
    local low=$(echo "$vuln_counts" | jq -r '.low')
    
    # Update global counters
    CRITICAL_VULNERABILITIES=$((CRITICAL_VULNERABILITIES + critical))
    HIGH_VULNERABILITIES=$((HIGH_VULNERABILITIES + high))
    
    # Generate human-readable report
    npm audit --no-color > "$npm_report_html" 2>&1 || true
    
    # Run snyk test if available and scan level is deep
    if [ "$SCAN_LEVEL" = "deep" ] && command -v snyk &> /dev/null; then
        local snyk_report="$REPORTS_DIR/backend_snyk_$TIMESTAMP.json"
        echo "Running Snyk test..."
        snyk test --json > "$snyk_report" || true
        
        # Parse snyk results
        if [ -f "$snyk_report" ]; then
            local snyk_counts
            snyk_counts=$(parse_snyk_results "$snyk_report")
            local snyk_critical=$(echo "$snyk_counts" | jq -r '.critical')
            local snyk_high=$(echo "$snyk_counts" | jq -r '.high')
            
            # Update global counters with Snyk results
            CRITICAL_VULNERABILITIES=$((CRITICAL_VULNERABILITIES + snyk_critical))
            HIGH_VULNERABILITIES=$((HIGH_VULNERABILITIES + snyk_high))
            
            # Update local counters for summary
            critical=$((critical + snyk_critical))
            high=$((high + snyk_high))
        fi
    fi
    
    # Print summary
    echo "Backend dependency scan complete."
    echo "Vulnerabilities found: $critical critical, $high high, $moderate moderate, $low low"
    echo "Reports saved to:"
    echo "  - $npm_report"
    echo "  - $npm_report_html"
    if [ -f "$snyk_report" ]; then
        echo "  - $snyk_report"
    fi
    echo
    
    # Set exit code based on vulnerability severity
    if [ "$critical" -gt 0 ]; then
        backend_exit_code=3
    elif [ "$high" -gt 0 ]; then
        backend_exit_code=2
    elif [ "$moderate" -gt 0 ]; then
        backend_exit_code=1
    fi
    
    return $backend_exit_code
}

# Function to scan Docker image for vulnerabilities
scan_docker_image() {
    local docker_exit_code=0
    
    # Check if trivy is installed
    if ! command -v trivy &> /dev/null; then
        echo "Skipping Docker image scan: trivy not installed."
        return 0
    fi
    
    echo "Scanning Docker image..."
    
    # Change to backend directory
    cd "$BACKEND_DIR" || { 
        echo "Error: Backend directory not found at $BACKEND_DIR"; 
        return 10; 
    }
    
    # Build Docker image for scanning
    echo "Building Docker image for scanning..."
    local image_name="aiagent-websocket:scan-$TIMESTAMP"
    if ! docker build -t "$image_name" .; then
        echo "Error: Failed to build Docker image."
        return 10
    fi
    
    # Create scan report filename
    local trivy_report="$REPORTS_DIR/docker_trivy_$TIMESTAMP.json"
    local trivy_report_text="$REPORTS_DIR/docker_trivy_$TIMESTAMP.txt"
    
    # Run trivy scan
    echo "Running Trivy scan..."
    trivy image --format json --output "$trivy_report" "$image_name"
    trivy image --output "$trivy_report_text" "$image_name"
    
    # Parse trivy results
    local vuln_counts
    vuln_counts=$(parse_trivy_results "$trivy_report")
    local critical=$(echo "$vuln_counts" | jq -r '.critical')
    local high=$(echo "$vuln_counts" | jq -r '.high')
    local moderate=$(echo "$vuln_counts" | jq -r '.moderate')
    local low=$(echo "$vuln_counts" | jq -r '.low')
    
    # Update global counters
    CRITICAL_VULNERABILITIES=$((CRITICAL_VULNERABILITIES + critical))
    HIGH_VULNERABILITIES=$((HIGH_VULNERABILITIES + high))
    
    # Print summary
    echo "Docker image scan complete."
    echo "Vulnerabilities found: $critical critical, $high high, $moderate moderate, $low low"
    echo "Reports saved to:"
    echo "  - $trivy_report"
    echo "  - $trivy_report_text"
    echo
    
    # Set exit code based on vulnerability severity
    if [ "$critical" -gt 0 ]; then
        docker_exit_code=3
    elif [ "$high" -gt 0 ]; then
        docker_exit_code=2
    elif [ "$moderate" -gt 0 ]; then
        docker_exit_code=1
    fi
    
    # Clean up
    echo "Removing temporary Docker image..."
    docker rmi "$image_name" > /dev/null 2>&1 || true
    
    return $docker_exit_code
}

# Function to generate summary report
generate_summary_report() {
    local summary_report="$REPORTS_DIR/summary_$TIMESTAMP.html"
    local summary_json="$REPORTS_DIR/summary_$TIMESTAMP.json"
    
    echo "Generating summary report..."
    
    # Create JSON summary
    cat > "$summary_json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "scan_level": "$SCAN_LEVEL",
  "vulnerability_counts": {
    "critical": $CRITICAL_VULNERABILITIES,
    "high": $HIGH_VULNERABILITIES
  },
  "exit_code": $EXIT_CODE,
  "reports": {
    "frontend_npm_audit": "$REPORTS_DIR/frontend_npm_audit_$TIMESTAMP.json",
    "backend_npm_audit": "$REPORTS_DIR/backend_npm_audit_$TIMESTAMP.json"
  }
}
EOF
    
    # Create HTML summary
    cat > "$summary_report" << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Dependency Scan Summary - AI Agent Network</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .summary { margin: 20px 0; }
        .critical { color: #d00; }
        .high { color: #f60; }
        .moderate { color: #f90; }
        .low { color: #99c; }
        .report-list { margin: 20px 0; }
        .footer { margin-top: 30px; color: #666; font-size: 0.8em; }
    </style>
</head>
<body>
    <h1>Dependency Scan Summary - AI Agent Network</h1>
    <div class="summary">
        <p><strong>Scan Date:</strong> $(date)</p>
        <p><strong>Scan Level:</strong> $SCAN_LEVEL</p>
        <p><strong>Result:</strong> 
EOF
    
    # Add result based on vulnerability counts
    if [ $CRITICAL_VULNERABILITIES -gt 0 ]; then
        echo "<span class=\"critical\">Critical vulnerabilities detected!</span>" >> "$summary_report"
    elif [ $HIGH_VULNERABILITIES -gt 0 ]; then
        echo "<span class=\"high\">High vulnerabilities detected!</span>" >> "$summary_report"
    elif [ "$EXIT_CODE" -eq 1 ]; then
        echo "<span class=\"moderate\">Moderate vulnerabilities detected.</span>" >> "$summary_report"
    else
        echo "<span style=\"color: green;\">No significant vulnerabilities detected.</span>" >> "$summary_report"
    fi
    
    # Continue HTML report
    cat >> "$summary_report" << EOF
        </p>
        <p><strong>Vulnerability Counts:</strong></p>
        <ul>
            <li class="critical">Critical: $CRITICAL_VULNERABILITIES</li>
            <li class="high">High: $HIGH_VULNERABILITIES</li>
        </ul>
    </div>
    
    <div class="report-list">
        <h2>Generated Reports</h2>
        <ul>
EOF
    
    # Add links to individual reports
    find "$REPORTS_DIR" -name "*_$TIMESTAMP.*" -not -name "summary_*" | sort | while read -r report; do
        echo "            <li><a href=\"file://$report\">$(basename "$report")</a></li>" >> "$summary_report"
    done
    
    # Finish HTML report
    cat >> "$summary_report" << EOF
        </ul>
    </div>
    
    <div class="footer">
        <p>AI Agent Network Dependency Scan Report - Generated on $(date)</p>
    </div>
</body>
</html>
EOF
    
    echo "Summary reports saved to:"
    echo "  - $summary_report"
    echo "  - $summary_json"
    echo
    
    # Print console summary
    echo "========================================================"
    echo "SCAN SUMMARY"
    echo "========================================================"
    echo "Critical vulnerabilities: $CRITICAL_VULNERABILITIES"
    echo "High vulnerabilities:     $HIGH_VULNERABILITIES"
    echo
    echo "Exit code: $EXIT_CODE"
    echo "  0: No significant vulnerabilities"
    echo "  1: Moderate vulnerabilities found"
    echo "  2: High vulnerabilities found"
    echo "  3: Critical vulnerabilities found"
    echo "========================================================"
}

# Function to parse npm audit results
parse_npm_audit() {
    local audit_file="$1"
    
    # Check if file exists
    if [ ! -f "$audit_file" ]; then
        echo '{"critical": 0, "high": 0, "moderate": 0, "low": 0}'
        return
    fi
    
    # Parse npm audit JSON output
    local critical high moderate low
    
    # Check if the file is empty or not valid JSON
    if [ ! -s "$audit_file" ] || ! jq empty "$audit_file" 2>/dev/null; then
        echo '{"critical": 0, "high": 0, "moderate": 0, "low": 0}'
        return
    fi
    
    # Extract vulnerability counts from npm audit format (changes in npm 7+)
    if jq -e '.auditReportVersion' "$audit_file" > /dev/null 2>&1; then
        # npm 7+ format
        critical=$(jq -r '.vulnerabilities.critical // 0' "$audit_file")
        high=$(jq -r '.vulnerabilities.high // 0' "$audit_file")
        moderate=$(jq -r '.vulnerabilities.moderate // 0' "$audit_file")
        low=$(jq -r '.vulnerabilities.low // 0' "$audit_file")
    else
        # npm 6 format
        critical=$(jq -r '[.advisories[] | select(.severity == "critical")] | length' "$audit_file")
        high=$(jq -r '[.advisories[] | select(.severity == "high")] | length' "$audit_file")
        moderate=$(jq -r '[.advisories[] | select(.severity == "moderate")] | length' "$audit_file")
        low=$(jq -r '[.advisories[] | select(.severity == "low")] | length' "$audit_file")
    fi
    
    # Ensure values are numeric
    critical=${critical:-0}
    high=${high:-0}
    moderate=${moderate:-0}
    low=${low:-0}
    
    # Return JSON object with counts
    echo "{\"critical\": $critical, \"high\": $high, \"moderate\": $moderate, \"low\": $low}"
}

# Function to parse Snyk test results
parse_snyk_results() {
    local snyk_file="$1"
    
    # Check if file exists
    if [ ! -f "$snyk_file" ]; then
        echo '{"critical": 0, "high": 0, "moderate": 0, "low": 0}'
        return
    fi
    
    # Parse Snyk test JSON output
    local critical high moderate low
    
    # Check if the file is empty or not valid JSON
    if [ ! -s "$snyk_file" ] || ! jq empty "$snyk_file" 2>/dev/null; then
        echo '{"critical": 0, "high": 0, "moderate": 0, "low": 0}'
        return
    fi
    
    # Extract vulnerability counts
    critical=$(jq -r '[.vulnerabilities[] | select(.severity == "critical")] | length' "$snyk_file")
    high=$(jq -r '[.vulnerabilities[] | select(.severity == "high")] | length' "$snyk_file")
    moderate=$(jq -r '[.vulnerabilities[] | select(.severity == "medium")] | length' "$snyk_file")
    low=$(jq -r '[.vulnerabilities[] | select(.severity == "low")] | length' "$snyk_file")
    
    # Ensure values are numeric
    critical=${critical:-0}
    high=${high:-0}
    moderate=${moderate:-0}
    low=${low:-0}
    
    # Return JSON object with counts
    echo "{\"critical\": $critical, \"high\": $high, \"moderate\": $moderate, \"low\": $low}"
}

# Function to parse Trivy scan results
parse_trivy_results() {
    local trivy_file="$1"
    
    # Check if file exists
    if [ ! -f "$trivy_file" ]; then
        echo '{"critical": 0, "high": 0, "moderate": 0, "low": 0}'
        return
    fi
    
    # Parse Trivy JSON output
    local critical high moderate low
    
    # Check if the file is empty or not valid JSON
    if [ ! -s "$trivy_file" ] || ! jq empty "$trivy_file" 2>/dev/null; then
        echo '{"critical": 0, "high": 0, "moderate": 0, "low": 0}'
        return
    fi
    
    # Extract vulnerability counts
    critical=$(jq -r '[.Results[] | .Vulnerabilities? // [] | .[] | select(.Severity == "CRITICAL")] | length' "$trivy_file")
    high=$(jq -r '[.Results[] | .Vulnerabilities? // [] | .[] | select(.Severity == "HIGH")] | length' "$trivy_file")
    moderate=$(jq -r '[.Results[] | .Vulnerabilities? // [] | .[] | select(.Severity == "MEDIUM")] | length' "$trivy_file")
    low=$(jq -r '[.Results[] | .Vulnerabilities? // [] | .[] | select(.Severity == "LOW")] | length' "$trivy_file")
    
    # Ensure values are numeric
    critical=${critical:-0}
    high=${high:-0}
    moderate=${moderate:-0}
    low=${low:-0}
    
    # Return JSON object with counts
    echo "{\"critical\": $critical, \"high\": $high, \"moderate\": $moderate, \"low\": $low}"
}

# Function to print usage information
print_usage() {
    cat << EOF
Dependency Scanning Script for AI Agent Network
-----------------------------------------------

This script scans dependencies across the project to identify security
vulnerabilities, outdated packages, and potential licensing issues.

Usage: $0 [options]

Options:
  -l, --level <level>       Scan level: basic, standard, deep (default: standard)
  -f, --frontend-only       Scan only frontend dependencies
  -b, --backend-only        Scan only backend dependencies
  -d, --docker-only         Scan only Docker image
  -o, --output-dir <dir>    Custom output directory for reports
  -h, --help                Show this help message

Exit codes:
  0: No vulnerabilities found or only low severity vulnerabilities
  1: Moderate vulnerabilities found
  2: High vulnerabilities found
  3: Critical vulnerabilities found
  10: Script execution error (missing dependencies, invalid arguments)

Examples:
  $0                        Run standard scan on all components
  $0 -l deep                Run deep scan on all components
  $0 -f -l basic            Run basic scan on frontend only
  $0 -o /path/to/reports    Save reports to custom directory

EOF
}

# Main function to orchestrate the scanning process
main() {
    local scan_frontend=true
    local scan_backend=true
    local scan_docker=true
    local main_exit_code=0
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--level)
                SCAN_LEVEL="$2"
                if [[ ! "$SCAN_LEVEL" =~ ^(basic|standard|deep)$ ]]; then
                    echo "Error: Invalid scan level. Must be 'basic', 'standard', or 'deep'."
                    print_usage
                    return 10
                fi
                shift 2
                ;;
            -f|--frontend-only)
                scan_backend=false
                scan_docker=false
                shift
                ;;
            -b|--backend-only)
                scan_frontend=false
                scan_docker=false
                shift
                ;;
            -d|--docker-only)
                scan_frontend=false
                scan_backend=false
                shift
                ;;
            -o|--output-dir)
                REPORTS_DIR="$2"
                shift 2
                ;;
            -h|--help)
                print_usage
                return 0
                ;;
            *)
                echo "Error: Unknown option: $1"
                print_usage
                return 10
                ;;
        esac
    done
    
    # Check dependencies
    if ! check_dependencies; then
        echo "Error: Missing required dependencies. Please install them and try again."
        return 10
    fi
    
    # Setup environment
    setup_environment
    
    # Run scans based on options
    local frontend_exit_code=0
    local backend_exit_code=0
    local docker_exit_code=0
    
    if $scan_frontend; then
        scan_frontend_dependencies
        frontend_exit_code=$?
        # Update main exit code
        if [ $frontend_exit_code -gt $main_exit_code ]; then
            main_exit_code=$frontend_exit_code
        fi
    fi
    
    if $scan_backend; then
        scan_backend_dependencies
        backend_exit_code=$?
        # Update main exit code
        if [ $backend_exit_code -gt $main_exit_code ]; then
            main_exit_code=$backend_exit_code
        fi
    fi
    
    if $scan_docker; then
        scan_docker_image
        docker_exit_code=$?
        # Update main exit code
        if [ $docker_exit_code -gt $main_exit_code ] && [ $docker_exit_code -ne 10 ]; then
            main_exit_code=$docker_exit_code
        fi
    fi
    
    # Set global exit code
    EXIT_CODE=$main_exit_code
    
    # Generate summary report
    generate_summary_report
    
    return $main_exit_code
}

# Run main function with command line arguments
main "$@"
exit $?