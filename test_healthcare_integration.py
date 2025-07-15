#!/usr/bin/env python3
"""
Healthcare Integration Test Suite
Tests the integration of ron4real healthcare functionality into Nira
"""

import os
import sys
import json
import requests
from typing import Dict, List, Any

def test_healthcare_types():
    """Test that healthcare types are properly defined"""
    print("✓ Testing healthcare type definitions...")
    
    # Check if healthcare types file exists
    types_file = "./src/lib/healthcare-types.ts"
    if not os.path.exists(types_file):
        print("❌ Healthcare types file not found")
        return False
    
    with open(types_file, 'r') as f:
        content = f.read()
        
    # Check for essential type definitions
    required_types = [
        'interface Provider',
        'interface SearchFilters', 
        'interface BrowserSession',
        'interface HealthcareMessage',
        'type SearchMode'
    ]
    
    for type_def in required_types:
        if type_def not in content:
            print(f"❌ Missing type definition: {type_def}")
            return False
    
    print("✓ All healthcare types properly defined")
    return True

def test_healthcare_service():
    """Test healthcare provider service"""
    print("✓ Testing healthcare provider service...")
    
    service_file = "./src/lib/healthcare-provider-service.ts"
    if not os.path.exists(service_file):
        print("❌ Healthcare provider service file not found")
        return False
    
    with open(service_file, 'r') as f:
        content = f.read()
    
    # Check for essential service methods
    required_methods = [
        'searchProviders',
        'getProviderByNPI',
        'geocodeProviders',
        'getCommonSpecialties',
        'detectProviderSearchIntent',
        'extractSearchParameters'
    ]
    
    for method in required_methods:
        if method not in content:
            print(f"❌ Missing service method: {method}")
            return False
    
    print("✓ Healthcare provider service properly implemented")
    return True

def test_ui_components():
    """Test that UI components are properly copied"""
    print("✓ Testing UI component integration...")
    
    # Check for essential healthcare components
    required_components = [
        "./src/components/HealthcareTaskActiveView.tsx",
        "./src/components/HealthcareAgentTrace.tsx", 
        "./src/components/HealthcareProviderCard.tsx",
        "./src/components/HealthcareMapView.tsx",
        "./src/components/HealthcarePromptBuilder.tsx"
    ]
    
    for component in required_components:
        if not os.path.exists(component):
            print(f"❌ Missing component: {component}")
            return False
    
    # Check UI library components
    ui_components_dir = "./src/components/ui"
    if not os.path.exists(ui_components_dir):
        print("❌ UI components directory not found")
        return False
    
    essential_ui_components = [
        "button.tsx", "card.tsx", "dialog.tsx", "input.tsx", 
        "select.tsx", "tabs.tsx", "badge.tsx", "separator.tsx"
    ]
    
    for component in essential_ui_components:
        component_path = os.path.join(ui_components_dir, component)
        if not os.path.exists(component_path):
            print(f"❌ Missing UI component: {component}")
            return False
    
    print("✓ All UI components properly integrated")
    return True

def test_package_dependencies():
    """Test that package.json has required dependencies"""
    print("✓ Testing package dependencies...")
    
    package_file = "./package.json"
    if not os.path.exists(package_file):
        print("❌ package.json not found")
        return False
    
    with open(package_file, 'r') as f:
        package_data = json.load(f)
    
    dependencies = package_data.get('dependencies', {})
    
    # Check for essential healthcare dependencies
    required_deps = [
        '@genkit-ai/googleai',
        '@genkit-ai/next',
        '@vis.gl/react-google-maps',
        'framer-motion',
        'date-fns',
        'zod'
    ]
    
    for dep in required_deps:
        if dep not in dependencies:
            print(f"❌ Missing dependency: {dep}")
            return False
    
    print("✓ All required dependencies present")
    return True

def test_main_layout_integration():
    """Test that MainLayout includes healthcare functionality"""
    print("✓ Testing MainLayout healthcare integration...")
    
    layout_file = "./src/components/MainLayout.tsx"
    if not os.path.exists(layout_file):
        print("❌ MainLayout.tsx not found")
        return False
    
    with open(layout_file, 'r') as f:
        content = f.read()
    
    # Check for healthcare integration
    healthcare_indicators = [
        'HealthcareTaskActiveView',
        'useClaudeHealthcareBrowserService',
        'detectHealthcareIntent',
        'Stethoscope'
    ]
    
    for indicator in healthcare_indicators:
        if indicator not in content:
            print(f"❌ Missing healthcare integration: {indicator}")
            return False
    
    print("✓ MainLayout properly integrated with healthcare functionality")
    return True

def test_initial_view_examples():
    """Test that InitialView includes healthcare examples"""
    print("✓ Testing InitialView healthcare examples...")
    
    initial_view_file = "./src/components/InitialView.tsx"
    if not os.path.exists(initial_view_file):
        print("❌ InitialView.tsx not found")
        return False
    
    with open(initial_view_file, 'r') as f:
        content = f.read()
    
    # Check for healthcare examples
    healthcare_examples = [
        'Find Healthcare Providers',
        'cardiologist',
        'insurance',
        'appointment'
    ]
    
    for example in healthcare_examples:
        if example not in content:
            print(f"❌ Missing healthcare example: {example}")
            return False
    
    print("✓ InitialView includes healthcare examples")
    return True

def run_integration_tests():
    """Run all integration tests"""
    print("🏥 HEALTHCARE INTEGRATION TEST SUITE")
    print("=" * 50)
    
    tests = [
        test_healthcare_types,
        test_healthcare_service,
        test_ui_components,
        test_package_dependencies,
        test_main_layout_integration,
        test_initial_view_examples
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            print()
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            print()
    
    print("=" * 50)
    print(f"RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Healthcare integration successful!")
        return True
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return False

if __name__ == "__main__":
    success = run_integration_tests()
    sys.exit(0 if success else 1)
