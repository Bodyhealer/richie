"""
Declare and configure the models for the courses application
"""
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import ugettext_lazy as _

from cms.extensions import PageExtension
from cms.extensions.extension_pool import extension_pool


class Course(PageExtension):
    """
    The course page extension represents and records a course in the catalog.

    This model should be used to record structured data about the course whereas the
    associated page object is where we record the less structured information to display on the
    page that presents the course.

    The `active_session` field is the edX course_key of the current session.
    """
    active_session = models.CharField(
        max_length=200,
        verbose_name=_("Course key of active course session"),
        blank=True,
        null=True,
        db_index=True,
    )
    main_organization = models.ForeignKey(
        "organizations.Organization",
        related_name="main_courses",
        limit_choices_to={"extended_object__publisher_is_draft": True},
    )
    organizations = models.ManyToManyField(
        "organizations.Organization",
        related_name="courses",
        limit_choices_to={"extended_object__publisher_is_draft": True},
    )
    subjects = models.ManyToManyField(
        "Subject",
        related_name="courses",
        blank=True,
        limit_choices_to={"extended_object__publisher_is_draft": True},
    )

    ROOT_REVERSE_ID = "courses"
    TEMPLATE_DETAIL = "courses/cms/course_detail.html"

    class Meta:
        verbose_name = _("course")

    def __str__(self):
        """Human representation of a course."""
        session = self.active_session or "no active session"
        return "{model}: {title} ({session})".format(
            model=self._meta.verbose_name.title(),
            title=self.extended_object.get_title(),
            session=session,
        )

    def copy_relations(self, oldinstance, language):
        """
        We must manually copy the many-to-many relations from the "draft" instance
        to the "published" instance.
        """
        # pylint: disable=no-member
        self.organizations.set(oldinstance.organizations.all())
        self.subjects.set(oldinstance.subjects.all())

    def validate_unique(self, exclude=None):
        """
        We can't rely on a database constraint for uniqueness because pages
        exist in two versions: draft and published.
        """
        if self.active_session:
            # Check uniqueness for the version being saved (draft or published)
            is_draft = self.extended_object.publisher_is_draft
            uniqueness_query = self.__class__.objects.filter(
                active_session=self.active_session,
                extended_object__publisher_is_draft=is_draft,
            )

            # If the page is being updated, we should exclude it while looking for duplicates
            if self.pk:
                uniqueness_query = uniqueness_query.exclude(pk=self.pk)

            # Raise a ValidationError if the active session already exists
            if uniqueness_query.exists():
                raise ValidationError(
                    {
                        "active_session": [
                            "A course already exists with this active session."
                        ]
                    }
                )
        return super().validate_unique(exclude=exclude)

    def save(self, *args, **kwargs):
        """
        Enforce validation each time an instance is saved
        Make sure the main organization is also included in `organizations` as a m2m relation
        """
        self.full_clean()
        super().save(*args, **kwargs)

        if self.pk:
            # pylint: disable=no-member
            self.organizations.add(self.main_organization)


class Subject(PageExtension):
    """
    The subject page extension represents and records a thematic in the catalog.

    This model should be used to record structured data about the thematic whereas the
    associated page object is where we record the less structured information to display on the
    page that presents the thematic.
    """

    ROOT_REVERSE_ID = "subjects"
    TEMPLATE_DETAIL = "courses/cms/subject_detail.html"

    class Meta:
        verbose_name = _("subject")

    def __str__(self):
        """Human representation of a subject"""
        return "{model}: {title}".format(
            model=self._meta.verbose_name.title(),
            title=self.extended_object.get_title(),
        )

    def copy_relations(self, oldinstance, language):
        """
        We must manually copy the many-to-many relations from the "draft" instance
        to the "published" instance.
        """
        self.courses.set(oldinstance.courses.all())


extension_pool.register(Course)
extension_pool.register(Subject)
