import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-2">Information We Collect</h2>
              <p>
                RecipeChef collects information you provide directly to us, such as when you create an account, 
                add recipes, or interact with our community features.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">How We Use Your Information</h2>
              <p>
                We use your information to provide, maintain, and improve our services, including recipe management, 
                community features, and personalized recommendations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Information Sharing</h2>
              <p>
                We do not sell your personal information. We may share your information only as described in this 
                privacy policy or with your consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information against unauthorized 
                access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us through our support channels.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
