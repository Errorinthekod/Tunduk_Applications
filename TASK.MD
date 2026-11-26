
Business case for programmers from JSC "Tүndүk"

"Clear application status in the appendix"

IUKR Job Gate Job Fair • November 26, 2026 • MUKR
Participants: students majoring in Software Engineering.

180 minutes for development, 5-7 minutes for demonstration and 3-5 minutes for questions from experts.

Situation

A citizen submitted an application for a government service through an app. A few days later, he opens the app and sees the status "Under Review." He's unsure when the status was updated or whether he needs to take any action. He contacts customer support.

Over the past month, the support service received 1,000 requests, 320 of which were related to application statuses. 180 of these requests asked about the status of their application, 90 asked what they needed to do, and 50 asked why the status hadn't been updated in a while.

Your team has been tasked with developing a prototype of the "My Applications" screen. Its purpose is to help citizens understand in just a few seconds the status of their application and what to do next. The situation, statistics, and status codes are purely imaginary. Test data is sufficient for this purpose.

Initial data

Status code     User value      User action

SUBMITTED   Application accepted    Wait for the review to begin

IN_REVIEW   The application is being considered     Wait for a decision

ACTION_REQUIRED     Clarification required      Open the application card and read what needs to be clarified

COMPLETED   The result is ready     Open result

REJECTED    Service denied  Open the decision and see the reason

The test record contains the request number, service name, status code, and last update date. For the ACTION_REQUIRED status, add a field with an explanation, such as "Please specify a contact number." If no explanation is available, provide a clear message and indicate where the user can obtain more information.


Task for the team

1. Create a list of applications and a card for a single application. In the list, show the service name, status, and update date. In the card, add a short explanation and the next step. The citizen should immediately see if action is required.

2. Implement status logic. Use local JSON or a test API. Show how the interface will change if the request goes from IN_REVIEW to ACTION_REQUIRED, and then to COMPLETED. The team chooses the programming language and tools themselves.

3. Prepare the interface in Kyrgyz and Russian.

It is enough to translate status titles, explanations, and buttons. Make sure the text is legible on a mobile screen, and the status is clear even without color highlighting.

4. Handle non-standard situations. Show what the user will see if they don't have any applications yet, the data hasn't loaded, or the system returns an unknown status code. If the team adds a notification, simply display the text "Application status updated."

5. Suggest a way to measure the results. The pilot's goal is to reduce the number of status inquiries from 320 to 240 per month with a comparable number of submitted applications. Calculate the percentage reduction and propose another metric to help understand whether the interface has become more user-friendly.

What to show at the defense

A working web or mobile prototype with test applications.

Status change scenario and one example of error handling.

Switching the language on the application card.

Calculating the target reduction in support requests and how to verify the results after launch.
