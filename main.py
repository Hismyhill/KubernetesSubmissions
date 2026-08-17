import random
import string
import time
from datetime import datetime

# 1. Generate a random string on startup and store it in memory
def generate_random_string(length=10):
    letters = string.ascii_letters + string.digits
    return ''.join(random.choice(letters) for _ in range(length))

# Store the string in memory
stored_string = generate_random_string()
print(f"Startup: Generated and stored string in memory -> '{stored_string}'")
print("Starting output loop (press Ctrl+C to stop)...\n")

# 2. Output the stored string every 5 seconds with a timestamp
try:
    while True:
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{current_time}] {stored_string}")
        time.sleep(5)
except KeyboardInterrupt:
    print("\nApplication stopped by user.")
