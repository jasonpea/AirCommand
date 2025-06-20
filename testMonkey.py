import subprocess

# Replace this with the name of the app you want to open
app_name = "Steam"
try:
    subprocess.run(["open", "-a", app_name], check=True)
    print(f"{app_name} opened successfully.")
except subprocess.CalledProcessError:
    print(f"Failed to open {app_name}. Make sure it is installed.")
